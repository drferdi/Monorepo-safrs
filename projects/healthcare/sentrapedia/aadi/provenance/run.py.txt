# imports
import asyncio
import json
import logging
import sys
import time

# from ast import literal_eval
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from assistants import MedAssistant, PatientAssistant, PatientContext
from backend.fhir_client import post_fhir_resource

# from backend.fhir_client import base_url, headersList, post_fhir_resource, session
from backend.fhir_setup import generate_patient_resource, setup_org_and_practitioner
from config import EVALUATION_MODE, SAVE_DIR
from conv import run_simulation, save_conversation
from dataset.mimic_dataset import MIMIC_Dataset
from openai import OpenAI, pydantic_function_tool
from paths import PANCREATIC_CANCER_INFO_PATH
from termcolor import colored
from tool_execs import (
    finish,
    generate_routine,
    get_blood_value_results,
    get_medication_results,
    get_microbiology_results,
    get_physical_exam_results,
    get_procedure_request_results,
    get_procedure_search_results,
    get_radiology_results,
    get_urine_value_results,
    patient_history,
)
from tools import (
    Finish,
    LabRequestList,
    MedicationRequestList,
    MicrobiologyRequestList,
    PatientHistory,
    PhysicalExamination,
    Plan,
    ProcedureRequestFHIR,
    ProcedureSearch,
    RadiologyRequestFHIR,
    UrineRequestList,
)
from tqdm import tqdm

if not EVALUATION_MODE:
    raise ValueError("Interactive mode via not included. Set EVALUATION_MODE=True.")

from visualisations import EvaluationOutputCollector as OutputCollector

print("Loaded evaluation mode.")

pd.set_option("display.max_colwidth", None)


if "ipykernel" in sys.modules:
    import nest_asyncio

    nest_asyncio.apply()

# prepare tool schemas excluding the planning tool for now
tools = [
    pydantic_function_tool(tool)
    for tool in [
        RadiologyRequestFHIR,
        MedicationRequestList,
        LabRequestList,
        MicrobiologyRequestList,
        PhysicalExamination,
        ProcedureRequestFHIR,
        ProcedureSearch,
        UrineRequestList,
        Finish,
    ]
]

# excludes the planning tool for the planning routine
tools_for_planning_routine = list(tools)
# add the planning tool back to the tools list
tools.append(pydantic_function_tool(Plan))

# map the tools
func_name_to_func = {
    "PhysicalExamination": get_physical_exam_results,
    "LabRequestList": get_blood_value_results,
    "MicrobiologyRequestList": get_microbiology_results,
    "MedicationRequestList": get_medication_results,
    "RadiologyRequestFHIR": get_radiology_results,
    "ProcedureRequestFHIR": get_procedure_request_results,
    "ProcedureSearch": get_procedure_search_results,
    "UrineRequestList": get_urine_value_results,
    "Plan": generate_routine,
    "Finish": finish,
    "PatientHistory": patient_history,
}

# logging.basicConfig(
#     level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
# )
# logger = logging.getLogger(__name__)


def get_admission_medication(patient):
    """Handle the case where the admission medication is not available."""
    admission_medication_df = patient.history_pe_admedication_diagnosis[
        "admission_medication"
    ]
    assert isinstance(admission_medication_df.values, np.ndarray)
    try:
        if len(admission_medication_df.values) == 0:
            admission_medication = "No current medication."
        else:
            admission_medication = admission_medication_df.values[0]
        if (
            not admission_medication
        ):  # corner case where admission_medication_df is not str, but None-Type
            admission_medication = "No current medication."
    except Exception as e:
        print(
            f"Error getting admission medication: {e}. Setting to `No current medication.`."
        )
        admission_medication = "No current medication."

    return admission_medication


def get_admission_chief_complaint(patient):
    """Handle the case where the admission chief complaint is not available."""
    cc_df = patient.triage.chiefcomplaint
    assert isinstance(cc_df.values, np.ndarray)
    if len(cc_df.values) == 0:
        cc = ""
    else:
        cc = cc_df.values[0]
    return cc


def prepare_patient(
    ds_name: str,
    ds: MIMIC_Dataset,
    ds_idx: int,
    base_url: str,
    headers_list: list,
    session,
    tools_for_planning_routine,
    tools,
    func_name_to_func: Dict[str, Callable],
    medical_assistant_model: str,
    medical_assistant_temperature: float,
    patient_assistant_model: str,
    patient_assistant_temperature: float,
    medical_system_prompt: str,
    completion_prompt: str,
    patient_system_prompt: str,
    *args,  # to catch overflowing arguments
    **kwargs,  # to catch overflowing arguments
) -> Tuple:
    """
    Prepare a single patient instance with all required resources.

    Parameters:
    - ds: The dataset containing all patients.
    - ds_idx (int): Index of the patient in the dataset.
    - headers_list (list): A list of headers for API requests.

    Returns:
    - Tuple containing medical_assistant, patient_assistant, patient_context, patient_data, collector.
    """
    patient_data = ds[ds_idx]
    # print(patient_data)

    # Setup organization and practitioner
    organization_id, practitioner_id = setup_org_and_practitioner(
        base_url=base_url, headers_list=headers_list, session=session
    )

    # Generate patient and post to server
    patient = generate_patient_resource(patient_data.patients, practitioner_id)
    patient_id = post_fhir_resource(patient, headers_list, session=session)

    primary_symptom = get_admission_chief_complaint(patient_data)

    if ds_name == "pancreatic_cancer":
        with open(PANCREATIC_CANCER_INFO_PATH, mode="r") as f:
            patient_infos = json.load(f)

        existing_patient_info = patient_infos[str(ds_idx)]

        admission_reason = existing_patient_info["admission_reason"]
        existing_info = existing_patient_info["existing_info"]
        diagnosis_status = existing_patient_info["has_diagnosis"]["diagnosis_status"]
        if diagnosis_status:
            external_staging = existing_patient_info["has_diagnosis"][
                "external_staging"
            ]
        else:
            external_staging = []
        if external_staging:
            external_staging_str = "\n".join(
                [
                    f"{imaging['imaging_type']} scan in the {imaging['region']} region: {imaging['result']}"
                    for imaging in external_staging
                ]
            )
        else:
            external_staging_str = "No external staging information available."

        primary_symptom += f"The admission reason: {admission_reason}\nThe existing information on the patient from previous visits: {existing_info}\nThe external staging information: {external_staging_str}"

        tools.append(pydantic_function_tool(PatientHistory))

    anamnesis_summary = patient_data.history_pe_admedication_diagnosis[
        "extracted_history"
    ].values[0]
    anamnesis_summary = str(anamnesis_summary).strip()
    # assert isinstance(literal_eval(anamnesis_summary), str), "Extracted history is not a string"
    medication = "Medication:\n" + get_admission_medication(patient_data)
    anamnesis_summary += medication

    age = None
    sex = None
    try:
        raw_age = patient_data.patients.age.values[0]
    except Exception:
        try:
            raw_age = patient_data.patients.anchor_age.values[0]
        except Exception:
            raw_age = None
    if raw_age is not None and pd.notna(raw_age):
        raw_age = str(raw_age).strip()
        age = raw_age if raw_age else None

    try:
        raw_sex = patient_data.patients.gender.values[0]
    except Exception:
        try:
            raw_sex = patient_data.patients.sex.values[0]
        except Exception:
            raw_sex = None
    if raw_sex is not None and pd.notna(raw_sex):
        raw_sex = str(raw_sex).strip()
        sex = raw_sex if raw_sex else None

    # Create patient context
    patient_ctx = PatientContext(
        patient_id=patient_id,
        patient_hadm_id=ds_idx,
        organization_id=organization_id,
        practitioner_id=practitioner_id,
        session=session,
        headersList=headers_list,
        patient_data=patient_data,
        tools=tools_for_planning_routine,  # `Plan` tool is not included here
        # We do not add the patient_info here because it is updated as the conversation progresses
    )

    # Setup collector
    hadm_id = patient_data.admissions.hadm_id.values[0]
    collector = OutputCollector(hadm_id=hadm_id, dataset_name=ds.diagnosis)

    # Initialize medical assistant
    medical_assistant = MedAssistant(
        client=OpenAI(),
        name="Medical Doctor",
        model=medical_assistant_model,
        instructions=medical_system_prompt,
        completion_prompt=completion_prompt,
        tools=tools,
        func_name_to_func=func_name_to_func,
        temperature=medical_assistant_temperature,
        patient_context=patient_ctx,
        message_collector=collector,
    )

    patient_instructions = patient_system_prompt.format(
        primary_symptom=primary_symptom,
        anamnesis_summary=anamnesis_summary,
        clinical_history_summary=anamnesis_summary,
    )

    demographic_lines: list[str] = []
    if age:
        demographic_lines.append(f"Current age: {age}")
    if sex:
        demographic_lines.append(f"Sex: {sex}")
    if demographic_lines:
        patient_instructions = (
            patient_instructions.rstrip() + "\n\n" + "\n".join(demographic_lines)
        )

    # Initialize patient assistant
    patient_assistant = PatientAssistant(
        client=OpenAI(),
        name="Patient",
        model=patient_assistant_model,
        instructions=patient_instructions,
        temperature=patient_assistant_temperature,
        message_collector=collector,
    )

    return (
        medical_assistant,
        patient_assistant,
        patient_ctx,
        patient_data,
        collector,
        primary_symptom,
    )


def patient_iterator(**kwargs):
    """Yield a single patient at a time along with the total length."""
    ds: MIMIC_Dataset = kwargs.get("ds")
    ds_name: str = kwargs.pop("ds_name")
    max_samples = kwargs.get("max_samples")  # if set to None we use the entire dataset
    selected_hadm_ids = kwargs.get("selected_hadm_ids")
    if selected_hadm_ids is None:
        num_samples = (
            min(len(ds.hadm_ids), max_samples) if max_samples else len(ds.hadm_ids)
        )
        hadm_ids = list(ds.hadm_ids)[:num_samples]
    else:
        hadm_ids = [hadm_id for hadm_id in ds.hadm_ids if hadm_id in selected_hadm_ids]
        num_samples = min(len(hadm_ids), max_samples) if max_samples else len(hadm_ids)

    hadm_ids = hadm_ids[:num_samples]
    print(
        colored(
            f"Found simulations for {ds_name} with {num_samples} patients ...", "red"
        )
    )

    path = Path(kwargs.get("output_dir"))
    path.mkdir(parents=True, exist_ok=True)
    path = path / ds_name

    # Check if result file exists for each hadm_id and remove it from hadm_ids if it does
    # new_hadm_ids = hadm_ids
    new_hadm_ids = [
        hadm_id
        for hadm_id in hadm_ids
        if not (path / f"{ds_name}_{hadm_id}_conversation_1.jsonl").exists()
    ]

    print(
        colored(
            f"Running simulations for {ds_name} with {len(new_hadm_ids)} patients after removing {len(hadm_ids) - len(new_hadm_ids)} patients that already have a conversation...",
            "red",
        )
    )

    for hadm_idx in new_hadm_ids:
        yield prepare_patient(**kwargs, ds_name=ds_name, ds_idx=hadm_idx)


def run_simulations(
    output_dir: str,
    ds_name: str,
    ds: MIMIC_Dataset,
    base_url: str,
    headers_list: List,
    session,
    tools_for_planning_routine,
    tools,
    func_name_to_func: Dict[str, Callable],
    medical_assistant_model: str,
    medical_assistant_temperature: float,
    patient_assistant_model: str,
    patient_assistant_temperature: float,
    medical_system_prompt: str,
    completion_prompt: str,
    patient_system_prompt: str,
    max_samples: Optional[int] = None,
    evaluation_mode: bool = False,
    max_workers: int = 4,
    dry_run: bool = False,
    selected_hadm_ids: Optional[List[int]] = None,
    save_dir: str = SAVE_DIR,
):
    """
    Run simulations for patients using the provided dataset and configuration.

    This function can operate in two modes: evaluation mode and interactive mode.
    In evaluation mode, simulations are executed in parallel using multiple workers.
    In interactive mode, simulations are run sequentially, allowing for user interaction.

    Args:
        output_dir (str): The directory to save the output.
        ds_name (str): The name of the dataset.
        ds (MIMIC_Dataset): The dataset containing patient information.
        base_url (str): The base URL for API requests.
        headers_list (list): A list of headers for API requests.
        session: The session object for maintaining state across requests.
        tools_for_planning_routine: Tools used for planning routines, excluding the 'Plan' tool.
        tools: A collection of tools available for the simulation.
        func_name_to_func: A mapping of function names to their corresponding functions.
        medical_assistant_model (str): The model identifier for the medical assistant.
        medical_assistant_temperature (float): The temperature setting for the medical assistant model.
        patient_assistant_model (str): The model identifier for the patient assistant.
        patient_assistant_temperature (float): The temperature setting for the patient assistant model.
        medical_system_prompt (str): The system prompt for the medical assistant.
        completion_prompt (str): The prompt used to complete interactions.
        patient_system_prompt (str): The system prompt for the patient assistant.
        max_samples (Optional[int]): The maximum number of samples to process. If None, all samples are used.
        evaluation_mode (bool): If True, runs simulations in evaluation mode with parallel execution.
        max_workers (int): The maximum number of workers for parallel execution in evaluation mode.
        dry_run (bool): If True, we do not perform any evaluations, but just load and iterate the data.
        selected_hadm_ids (Optional[List[int]]): A list of hadm_ids to run the simulations for.

    Returns:
        None
    """

    if not evaluation_mode:
        raise ValueError(
            "Interactive mode has been removed. Run with evaluation_mode=True."
        )

    def _run_simulation_for_patient(patient_data_tuple, dry_run: bool = False):
        """Run a single simulation for a patient."""
        try:
            (
                medical_assistant,
                patient_assistant,
                patient_ctx,
                patient_data,
                collector,
                primary_symptom,
            ) = patient_data_tuple

            print(
                colored(
                    f"Running simulation for patient {patient_ctx.patient_hadm_id}...",
                    "red",
                )
            )
            if dry_run:
                pass
            else:
                this_patient_start = time.time()
                asyncio.run(
                    run_simulation(
                        medical_assistant,
                        patient_assistant,
                        primary_symptom,
                    )
                )
                this_patient_end = time.time()
                collector.save()
                save_conversation(
                    medical_assistant,
                    patient_assistant,
                    patient_ctx,
                    patient_data,
                    patient_data.patients.index[0],
                    ds.diagnosis,
                    total_time_elapsed=this_patient_end - this_patient_start,
                    save_dir=save_dir,
                )
        except Exception as e:
            print(
                f"Error running simulation for patient index {patient_data_tuple[3].patients.index[0]}: {e}"
            )

    # Prepare patient iterator
    patient_gen = patient_iterator(
        output_dir=output_dir,
        ds_name=ds_name,
        ds=ds,
        base_url=base_url,
        headers_list=headers_list,
        session=session,
        tools_for_planning_routine=tools_for_planning_routine,
        tools=tools,
        func_name_to_func=func_name_to_func,
        medical_assistant_model=medical_assistant_model,
        medical_assistant_temperature=medical_assistant_temperature,
        patient_assistant_model=patient_assistant_model,
        patient_assistant_temperature=patient_assistant_temperature,
        medical_system_prompt=medical_system_prompt,
        completion_prompt=completion_prompt,
        patient_system_prompt=patient_system_prompt,
        max_samples=max_samples,
        selected_hadm_ids=selected_hadm_ids,
    )

    total_len = len(list(patient_gen))

    patient_gen = patient_iterator(
        output_dir=output_dir,
        ds_name=ds_name,
        ds=ds,
        base_url=base_url,
        headers_list=headers_list,
        session=session,
        tools_for_planning_routine=tools_for_planning_routine,
        tools=tools,
        func_name_to_func=func_name_to_func,
        medical_assistant_model=medical_assistant_model,
        medical_assistant_temperature=medical_assistant_temperature,
        patient_assistant_model=patient_assistant_model,
        patient_assistant_temperature=patient_assistant_temperature,
        medical_system_prompt=medical_system_prompt,
        completion_prompt=completion_prompt,
        patient_system_prompt=patient_system_prompt,
        max_samples=max_samples,
        selected_hadm_ids=selected_hadm_ids,
    )

    # Initialize tqdm progress bar
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        with tqdm(
            total=total_len,
            desc="Running Simulations",
        ) as pbar:
            for patient_data_tuple in patient_gen:
                future = executor.submit(
                    _run_simulation_for_patient, patient_data_tuple, dry_run
                )
                futures.append(future)
                # Update progress bar as each task completes
                future.add_done_callback(lambda p: pbar.update())

            # wait for all futures to complete
            for future in futures:
                future.result()
