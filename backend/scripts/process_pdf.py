import sys
import pandas as pd
import os
from pymongo import MongoClient

# Ensure UTF-8 encoding for logs
sys.stdout.reconfigure(encoding='utf-8')

# MongoDB Configuration
MONGO_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "BusFinder"
COLLECTION_NAME = "bus_routes"


def connect_to_mongo():
    """Establishes connection to MongoDB and returns collection reference."""
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    return client, db[COLLECTION_NAME]


def validate_file():
    """Validates if the script received a valid file path."""
    if len(sys.argv) < 2:
        print("❌ No file path provided.")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"❌ File does not exist: {file_path}")
        sys.exit(1)

    print(f"📂 Processing file: {file_path}")
    return file_path


def clean_excel_data(file_path):
    """Loads and cleans the Excel file, dropping empty rows/columns."""
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name=xls.sheet_names[0], skiprows=1)

    # Drop empty rows & columns, then reset index
    df = df.dropna(axis=1, how='all').dropna(axis=0, how='all').reset_index(drop=True)
    return df


def extract_bus_routes(df):
    """Extracts bus routes and stop names from the DataFrame."""
    bus_routes = []

    for col in df.columns:
        current_col_index = df.columns.get_loc(col)
        gujarati_col_index = current_col_index + 1
        has_gujarati_col = gujarati_col_index < len(df.columns)

        bus_code = None
        stops = []

        for idx, value in enumerate(df[col]):
            if isinstance(value, str) and ('PT -' in value or 'KT -' in value):
                if bus_code and stops:
                    bus_routes.append({"Bus Code": bus_code, "Stops": stops})
                bus_code = value
                stops = []
            elif isinstance(value, (int, float)):
                if bus_code and stops:
                    bus_routes.append({"Bus Code": bus_code, "Stops": stops})
                    bus_code = None
                    stops = []
            elif bus_code:
                guj_value = ""
                if has_gujarati_col:
                    guj_value = df.iloc[idx, gujarati_col_index]
                    guj_value = "" if pd.isna(guj_value) else str(guj_value).strip().lower()

                english_name = str(value).strip().lower()
                combined_name = f"{english_name}/{guj_value}" if guj_value else english_name
                stops.append(combined_name)

        if bus_code and stops:
            bus_routes.append({"Bus Code": bus_code, "Stops": stops})

    return bus_routes


def store_in_mongo(collection, bus_routes):
    """Deletes old records and inserts new bus routes into MongoDB."""
    collection.delete_many({})
    print("✅ Existing bus routes deleted.")

    if bus_routes:
        collection.insert_many(bus_routes)
        print(f"✅ Inserted {len(bus_routes)} bus routes into MongoDB.")
    else:
        print("⚠️ No bus routes found in the file.")


def main():
    """Main function to run the script."""
    file_path = validate_file()
    df = clean_excel_data(file_path)
    bus_routes = extract_bus_routes(df)

    client, collection = connect_to_mongo()
    store_in_mongo(collection, bus_routes)
    client.close()

    print("✅ MongoDB connection closed.")


if __name__ == "__main__":
    main()
