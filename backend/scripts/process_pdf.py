import pytesseract
from pdf2image import convert_from_path
import re
from collections import defaultdict

pdf_path = r"D:\Projects\BusFinder\backend\data\42 BUSES FROM VADODARA GENERALSHIFT 11.11.2024.pdf"

bus_stops = defaultdict(list)

bus_number_pattern = re.compile(r'\b(KT|PT)\s*-\s*\d+\b')
bus_stop_pattern = re.compile(r'^[A-Z][A-Z0-9\-().,\s]*$', re.MULTILINE)
gujarati_pattern = re.compile(r'[\u0A80-\u0AFF]')

def extract_bus_data(pdf_path):
    images = convert_from_path(pdf_path)
    current_bus_number = None
    
    for image in images:
        text = pytesseract.image_to_string(image)
        if not text:
            continue
        
        lines = text.split("\n")
        for line in lines:
            if gujarati_pattern.search(line):
                continue

            bus_match = bus_number_pattern.search(line)
            if bus_match:
                current_bus_number = bus_match.group()
                continue
            
            stop_match = bus_stop_pattern.match(line.strip())
            if stop_match and current_bus_number:
                bus_stops[current_bus_number].append(line.strip())
    
    return bus_stops

bus_data = extract_bus_data(pdf_path)

for bus, stops in bus_data.items():
    print(f"{bus}: {', '.join(stops)}")
