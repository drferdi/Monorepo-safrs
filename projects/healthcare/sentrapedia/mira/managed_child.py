"""Windows child guardian: closing its Job Object reaps the entire child tree."""
import ctypes
from ctypes import wintypes
import subprocess
import sys

class IO_COUNTERS(ctypes.Structure):
    _fields_ = [(name, ctypes.c_ulonglong) for name in (
        "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
        "ReadTransferCount", "WriteTransferCount", "OtherTransferCount",
    )]

class BASIC_LIMITS(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong), ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
        ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD),
    ]

class EXTENDED_LIMITS(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", BASIC_LIMITS), ("IoInfo", IO_COUNTERS),
        ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]

class STARTUPINFO(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD), ("lpReserved", wintypes.LPWSTR),
        ("lpDesktop", wintypes.LPWSTR), ("lpTitle", wintypes.LPWSTR),
        *[(name, wintypes.DWORD) for name in ("dwX", "dwY", "dwXSize", "dwYSize", "dwXCountChars", "dwYCountChars", "dwFillAttribute", "dwFlags")],
        ("wShowWindow", wintypes.WORD), ("cbReserved2", wintypes.WORD),
        ("lpReserved2", ctypes.POINTER(wintypes.BYTE)),
        ("hStdInput", wintypes.HANDLE), ("hStdOutput", wintypes.HANDLE), ("hStdError", wintypes.HANDLE),
    ]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [("hProcess", wintypes.HANDLE), ("hThread", wintypes.HANDLE), ("dwProcessId", wintypes.DWORD), ("dwThreadId", wintypes.DWORD)]

def run():
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel.SetInformationJobObject.restype = wintypes.BOOL
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel.WaitForSingleObject.restype = wintypes.DWORD
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.CloseHandle.restype = wintypes.BOOL
    kernel.GetStdHandle.argtypes = [wintypes.DWORD]
    kernel.GetStdHandle.restype = wintypes.HANDLE
    kernel.CreateProcessW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, ctypes.c_void_p, ctypes.c_void_p, wintypes.BOOL, wintypes.DWORD, ctypes.c_void_p, wintypes.LPCWSTR, ctypes.POINTER(STARTUPINFO), ctypes.POINTER(PROCESS_INFORMATION)]
    kernel.CreateProcessW.restype = wintypes.BOOL
    kernel.ResumeThread.argtypes = [wintypes.HANDLE]
    kernel.ResumeThread.restype = wintypes.DWORD
    kernel.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.TerminateProcess.restype = wintypes.BOOL
    kernel.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
    kernel.GetExitCodeProcess.restype = wintypes.BOOL
    parent = kernel.OpenProcess(0x00100000, False, int(sys.argv[1]))  # SYNCHRONIZE
    if not parent:
        raise ctypes.WinError(ctypes.get_last_error())
    job = kernel.CreateJobObjectW(None, None)
    child = PROCESS_INFORMATION()
    try:
        if not job:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = EXTENDED_LIMITS()
        limits.BasicLimitInformation.LimitFlags = 0x00002000  # KILL_ON_JOB_CLOSE
        if not kernel.SetInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            raise ctypes.WinError(ctypes.get_last_error())
        startup = STARTUPINFO()
        startup.cb = ctypes.sizeof(startup)
        startup.dwFlags = 0x00000100  # STARTF_USESTDHANDLES
        startup.hStdInput = kernel.GetStdHandle(-10)
        startup.hStdOutput = kernel.GetStdHandle(-11)
        startup.hStdError = kernel.GetStdHandle(-12)
        command = ctypes.create_unicode_buffer(subprocess.list2cmdline(sys.argv[2:]))
        # No child instruction runs until the entire future subtree belongs to our job.
        if not kernel.CreateProcessW(sys.argv[2], command, None, None, True, subprocess.CREATE_NO_WINDOW | 0x00000004, None, None, ctypes.byref(startup), ctypes.byref(child)):  # CREATE_SUSPENDED
            raise ctypes.WinError(ctypes.get_last_error())
        if not kernel.AssignProcessToJobObject(job, child.hProcess):
            raise ctypes.WinError(ctypes.get_last_error())
        if kernel.ResumeThread(child.hThread) == 0xFFFFFFFF:
            raise ctypes.WinError(ctypes.get_last_error())
        while kernel.WaitForSingleObject(child.hProcess, 0) == 258:
            parent_state = kernel.WaitForSingleObject(parent, 100)
            if parent_state == 0:  # Supervisor exited, including forced termination.
                return 1
            if parent_state != 258:  # WAIT_TIMEOUT is the only expected live state.
                raise ctypes.WinError(ctypes.get_last_error())
        code = wintypes.DWORD()
        if not kernel.GetExitCodeProcess(child.hProcess, ctypes.byref(code)):
            raise ctypes.WinError(ctypes.get_last_error())
        return code.value
    finally:
        if job:
            kernel.CloseHandle(job)
        kernel.CloseHandle(parent)
        if child.hProcess:
            if kernel.WaitForSingleObject(child.hProcess, 0) == 258:
                kernel.TerminateProcess(child.hProcess, 1)
                kernel.WaitForSingleObject(child.hProcess, 5000)
            kernel.CloseHandle(child.hProcess)
        if child.hThread:
            kernel.CloseHandle(child.hThread)

if __name__ == "__main__":
    try:
        raise SystemExit(run())
    except KeyboardInterrupt:
        raise SystemExit(0)
