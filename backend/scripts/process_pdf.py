import pandas as pd
import glob
import os
from pymongo import MongoClient

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "BusFinder"
COLLECTION_NAME = "bus_routes"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]

# Delete all existing data before inserting new data
print("❌ Deleting existing bus routes...")
collection.delete_many({})  # Removes all existing bus routes
print("✅ All bus routes deleted. Ready to insert new data.")

# Define the data directory path
DATA_DIR = os.path.join(os.getcwd(), "backend", "data")

# Find all .xlsx files in the data directory
xlsx_files = glob.glob(os.path.join(DATA_DIR, "*.xlsx"))

if not xlsx_files:
    print("⚠️ No Excel files found in the data directory.")
else:
    for file_path in xlsx_files:
        print(f"\n📂 Processing file: {file_path}")

        # Load the Excel file
        xls = pd.ExcelFile(file_path)
        sheet_names = xls.sheet_names
        print("📄 Available sheets:", sheet_names)

        # Read the first sheet
        df_cleaned = pd.read_excel(xls, sheet_name=sheet_names[0], skiprows=1)

        # Drop empty rows/columns
        df_cleaned = df_cleaned.dropna(axis=1, how='all')
        df_cleaned = df_cleaned.dropna(axis=0, how='all')
        df_cleaned.reset_index(drop=True, inplace=True)

        # Convert stops to lowercase and clean them
        bus_routes = []

        for col in df_cleaned.columns:
            bus_code = None
            stops = []

            for value in df_cleaned[col]:
                if isinstance(value, str) and ('PT -' in value or 'KT -' in value):
                    if bus_code and stops:
                        bus_routes.append({"Bus Code": bus_code, "Stops": [stop.lower().strip() for stop in stops]})

                    bus_code = value
                    stops = []
                elif isinstance(value, (int, float)):
                    if bus_code and stops:
                        bus_routes.append({"Bus Code": bus_code, "Stops": [stop.lower().strip() for stop in stops]})
                        bus_code = None
                        stops = []
                elif bus_code:
                    stops.append(value)

        # Insert new data into MongoDB
        if bus_routes:
            collection.insert_many(bus_routes, ordered=False)
            print(f"✅ Inserted {len(bus_routes)} bus routes into MongoDB.")

# Close MongoDB connection
client.close()
print("✅ MongoDB connection closed.")
