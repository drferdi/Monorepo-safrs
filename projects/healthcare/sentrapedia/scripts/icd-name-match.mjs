// Words that carry no meaning when a diagnosis label is compared with an official ICD-10 name (as in mira/service/postchecks.py).
const FILLER = new Set("a an and as by due in not of or the to with without".split(" "));
const GENERIC = new Set([...FILLER, ..."acute chronic disease diseases disorder disorders other specified unspecified nos site type classified elsewhere".split(" ")]);
const words = text => (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(word => !FILLER.has(word));

// True when the label states the code's disease: a meaningful label word occurs in the official name of the code or of its
// three-character category. Approximate lexical overlap that errs both ways: synonyms ("Pertussis" vs "Whooping cough") and
// Indonesian labels miss, and a wrong disease sharing a class word ("Typhoid fever" for R50.9 Fever) still matches.
export const icdNameMatch = (code, label, names) => {
  const own = new Set([...words(names.get(code) ?? ""), ...words(names.get(code.slice(0, 3)) ?? "")]);
  return words(label).some(word => !GENERIC.has(word) && own.has(word));
};
