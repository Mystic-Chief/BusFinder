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
    """Establishes connection to MongoDB and returns collection reference."""
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return client, db[collection_name]

def validate_arguments():
    """Validates command line arguments."""
    if len(sys.argv) < 3:
        print("❌ Usage: python script.py <file_path> <collection_name>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    collection_name = sys.argv[2]
    
    if not os.path.exists(file_path):
        print(f"❌ File does not exist: {file_path}")
        sys.exit(1)

    print(f"📂 Processing file: {file_path} for collection: {collection_name}")
    return file_path, collection_name

def clean_excel_data(file_path):
    """Loads and cleans the Excel file."""
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name=xls.sheet_names[0], skiprows=1)
    return df.dropna(axis=1, how='all').dropna(axis=0, how='all').reset_index(drop=True)

def extract_bus_routes(df):
    """Extracts bus routes with strict regex pattern for PT, KT, and PU."""
    bus_routes = []
    
    for col in df.columns:
        current_col_index = df.columns.get_loc(col)
        gujarati_col_index = current_col_index + 1
        has_gujarati_col = gujarati_col_index < len(df.columns)

        bus_code = None
        stops = []

        for idx, value in enumerate(df[col]):
            # Strict regex pattern to match only cells starting with PT, KT, or PU
            if isinstance(value, str) and (match := re.match(
                r'^(PT|KT)\s*-\s*(\d+)$|^PU\s+(.+)$', 
                value.strip(), 
                re.IGNORECASE
            )):
                # Determine route type and format accordingly
                if match.group(1):  # PT/KT route
                    prefix = match.group(1).upper()
                    number = match.group(2).strip()
                    formatted_code = f"{prefix} - {number}"
                else:  # PU route
                    pu_text = match.group(3).strip()
                    formatted_code = f"PU {pu_text}"
                
                if bus_code and stops:
                    bus_routes.append({"Bus Code": bus_code, "Stops": stops})
                bus_code = formatted_code
                stops = []
            elif isinstance(value, (int, float)):
                if bus_code and stops:
                    bus_routes.append({"Bus Code": bus_code, "Stops": stops})
                    bus_code = None
                    stops = []
            elif bus_code:
                # Process stop names with Gujarati translations
                guj_value = ""
                if has_gujarati_col:
                    guj_value = df.iloc[idx, gujarati_col_index]
                    guj_value = "" if pd.isna(guj_value) else str(guj_value).strip().lower()
                
                eng_value = str(value).strip().lower()
                stops.append(f"{eng_value}/{guj_value}" if guj_value else eng_value)

        if bus_code and stops:
            bus_routes.append({"Bus Code": bus_code, "Stops": stops})
    
    return bus_routes

def store_in_mongo(collection, bus_routes):
    """Updates MongoDB collection with new routes."""
    collection.delete_many({})
    print("✅ Existing bus routes deleted.")
    
    if bus_routes:
        result = collection.insert_many(bus_routes)
        print(f"✅ Inserted {len(result.inserted_ids)} records into {collection.name}")
    else:
        print("⚠️ No valid bus routes found in file")

def main():
    """Main execution flow."""
    file_path, collection_name = validate_arguments()
    df = clean_excel_data(file_path)
    bus_routes = extract_bus_routes(df)
    
    client, collection = connect_to_mongo(collection_name)
    store_in_mongo(collection, bus_routes)
    client.close()
    print("✅ MongoDB connection closed")

if __name__ == "__main__":
    main()