"""Usage: python -m scripts.import_assam_dataset path/to/dataset.zip"""
import argparse
import json
from app.data.assam_dataset import import_zip

parser = argparse.ArgumentParser(description="Idempotently import Assam public procurement CSV files")
parser.add_argument("zip_path", help="Path to datasets_of_assam_public_procurement_data_7259310.zip")
args = parser.parse_args()
print(json.dumps(import_zip(args.zip_path), indent=2, ensure_ascii=False))
