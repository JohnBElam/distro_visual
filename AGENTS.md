# AGENTS.md

## Cursor Cloud specific instructions

This is a minimal Python project with a single entry point (`main.py`). No external dependencies, build tools, or services are required.

### Running the application

```
python3 main.py
```

### Lint / compile check

There is no linter or test framework configured. Use `python3 -m py_compile main.py` to verify syntax.

### Notes

- Python 3.6+ is required (f-strings are used).
- There are no dependencies to install — no `requirements.txt`, `pyproject.toml`, or `setup.py`.
- No services (databases, caches, etc.) are needed.
