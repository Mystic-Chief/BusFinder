import sys
import pandas as pd
import os
import re
from pymongo import MongoClient

# Ensure UTF-8 encoding for logs
sys.stdout.reconfigure(encoding='utf-8')

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "BusFinder"

def connect_to_mongo(collection_name):
    """Establish MongoDB connection and return collection reference."""
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return client, db[collection_name]

def validate_arguments():
    """Validates command line arguments."""
    if len(sys.argv) < 4:
        print("❌ Usage: python process_file.py <file_path> <collection_name> <file_type> [<start_date> <end_date> <exam_title> <direction>]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    collection_name = sys.argv[2]
    file_type = sys.argv[3]  # Either "bus" or "exam"

    extra_fields = {}
    if file_type == "exam" and len(sys.argv) == 8:
        extra_fields = {
            "startDate": sys.argv[4],
            "endDate": sys.argv[5],
            "examTitle": sys.argv[6],
            "direction": sys.argv[7]
        }

    if not os.path.exists(file_path):
        print(f"❌ File does not exist: {file_path}")
        sys.exit(1)

    print(f"📂 Processing file: {file_path} for collection: {collection_name} as {file_type}")
    return file_path, collection_name, file_type, extra_fields

def clean_excel_data(file_path):
    """Loads and cleans the Excel file."""
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name=xls.sheet_names[0], skiprows=1)
    return df.dropna(axis=1, how='all').dropna(axis=0, how='all').reset_index(drop=True)

def extract_routes(df):
    """Extracts routes for both bus schedules and exam schedules."""
    routes = []
    
    for col in df.columns:
        current_col_index = df.columns.get_loc(col)
        gujarati_col_index = current_col_index + 1
        has_gujarati_col = gujarati_col_index < len(df.columns)

        bus_code = None
        stops = []

        for idx, value in enumerate(df[col]):
            if isinstance(value, str) and (match := re.match(r'^(PT|KT)\s*-\s*(\d+)$|^PU\s+(.+)$', value.strip(), re.IGNORECASE)):
                if match.group(1):  # PT/KT route
                    prefix = match.group(1).upper()
                    number = match.group(2).strip()
                    formatted_code = f"{prefix} - {number}"
                else:  # PU route
                    pu_text = match.group(3).strip()
                    formatted_code = f"PU {pu_text}"
                
                if bus_code and stops:
                    routes.append({"Bus Code": bus_code, "Stops": stops})
                bus_code = formatted_code
                stops = []
            elif isinstance(value, (int, float)):
                if bus_code and stops:
                    routes.append({"Bus Code": bus_code, "Stops": stops})
                    bus_code = None
                    stops = []
            elif bus_code:
                guj_value = df.iloc[idx, gujarati_col_index] if has_gujarati_col else ""
                guj_value = "" if pd.isna(guj_value) else str(guj_value).strip().lower()
                
                eng_value = str(value).strip().lower()
                stops.append(f"{eng_value}/{guj_value}" if guj_value else eng_value)

        if bus_code and stops:
            routes.append({"Bus Code": bus_code, "Stops": stops})
    
    return routes

def store_in_mongo(collection, data, file_type, extra_fields):
    """Stores extracted data into MongoDB without removing unrelated exam schedules."""

    if file_type == "bus":
        # 🔥 Full delete for bus schedules
        collection.delete_many({})
        print("🗑 Old bus schedule data removed.")

    elif file_type == "exam":
        # 🛑 Only delete exams with the same title & direction
        delete_filter = {
            "examTitle": extra_fields.get("examTitle"),
            "direction": extra_fields.get("direction"),
        }
        collection.delete_many(delete_filter)
        print(f"🗑 Removed existing exam schedules for '{extra_fields.get('examTitle')}' ({extra_fields.get('direction')}).")

    if file_type == "exam":
        # Add extra exam details to each entry
        for entry in data:
            entry.update(extra_fields)

    if data:
        # ✅ Insert new records
        result = collection.insert_many(data)
        print(f"✅ Inserted {len(result.inserted_ids)} records into {collection.name}")
    else:
        print("⚠️ No valid data found in file")

def main():
    """Main execution flow."""
    file_path, collection_name, file_type, extra_fields = validate_arguments()
    df = clean_excel_data(file_path)
    data = extract_routes(df)

    client, collection = connect_to_mongo(collection_name)
    store_in_mongo(collection, data, file_type, extra_fields)
    client.close()
    print("✅ MongoDB connection closed")

if __name__ == "__main__":
    main()
