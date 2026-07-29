import os
import csv
import json

print("Iniciando indexacao completa dos 400.000+ alimentos do USDA CSV...")

# 1. Mapear Nutriente 1005 (Carbohydrate, by difference)
print("1. Indexando carboidratos (food_nutrient.csv)...")
carbs_map = {}

nutrient_path = "FoodData_Central_csv_2026-04-30/food_nutrient.csv"
with open(nutrient_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get("nutrient_id") == "1005":
            try:
                carbs_map[row.get("food_fdc_id")] = float(row.get("amount", 0.0))
            except ValueError:
                pass

print(f"   -> Mapeados carboidratos para {len(carbs_map)} alimentos.")

# 2. Ler todos os alimentos do food.csv
print("2. Lendo todos os alimentos (food.csv)...")
food_path = "FoodData_Central_csv_2026-04-30/food.csv"
total_saved = 0

output_file = "database/seeds/002_seed_usda_full_foods.sql"
os.makedirs("database/seeds", exist_ok=True)

def escape_sql(text):
    if text is None:
        return ""
    return str(text).replace("'", "''").replace("\\", "\\\\").strip()

with open(output_file, "w", encoding="utf-8") as out:
    out.write("-- Seed Completo USDA FoodData Central (Todos os Alimentos)\n")
    out.write("INSERT INTO food_database (id, name, brand, portion_size_g, portion_description, carbs_per_portion, source, is_verified, is_active) VALUES\n")
    
    buffer = []
    with open(food_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fdc_id = row.get("fdc_id")
            name = row.get("description")
            data_type = row.get("data_type", "USDA")
            
            if fdc_id in carbs_map and name:
                carbs = carbs_map[fdc_id]
                name_esc = escape_sql(name)
                type_esc = escape_sql(data_type)
                
                val_str = f"(UUID(), '{name_esc}', '{type_esc}', 100.0, '100g', {carbs}, 'USDA', TRUE, TRUE)"
                buffer.append(val_str)
                total_saved += 1
                
                # Gravar em lotes para nao estourar memoria
                if len(buffer) >= 10000:
                    out.write(",\n".join(buffer) + ",\n")
                    buffer = []
                    print(f"   -> {total_saved} alimentos processados...")

    if buffer:
        out.write(",\n".join(buffer) + ";\n")

print(f"SUCESSO TOTAL! {total_saved} alimentos importados do USDA CSV para o seed '{output_file}'.")
