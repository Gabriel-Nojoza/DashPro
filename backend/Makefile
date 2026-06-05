install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

start:
	python run.py

seed:
	python seed.py

test:
	pytest tests/ -v

lint:
	ruff check app/
	mypy app/
