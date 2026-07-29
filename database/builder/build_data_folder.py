import os
import csv
import json
import re

print("=====================================================================")
print("GERADOR CENTRALIZADO DE BANCO DE DADOS (DATA BUILDER)")
print("=====================================================================")

OUTPUT_SQL_SEEDS = "database/seeds/001_seed_unified_foods.sql"
OUTPUT_JSON_SEEDS = "data/unified_foods_database.json"

os.makedirs("database/seeds", exist_ok=True)
os.makedirs("data", exist_ok=True)

unified_foods = []
seen_names = set()

def escape_sql(text):
    if text is None:
        return ""
    return str(text).replace("'", "''").replace("\\", "\\\\").strip()

# -----------------------------------------------------------------------------
# FONTE 1: Manual de Contagem de Carboidratos SBD / TACO (docs/manual-contagem-carboidratos)
# -----------------------------------------------------------------------------
print("\n1. Extraindo dados do Manual SBD / TACO (docs/manual-contagem-carboidratos)...")
sbd_path = "docs/manual-contagem-carboidratos/README.md"
sbd_count = 0

if os.path.exists(sbd_path):
    with open(sbd_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("|") and "---" not in line and "Alimento" not in line:
                parts = [p.strip() for p in line.split("|")[1:-1]]
                if len(parts) >= 4:
                    name = parts[0]
                    portion = parts[1] if len(parts) > 1 else "100g"
                    try:
                        carbs_str = parts[3].replace(",", ".")
                        carbs = float(re.findall(r"\d+\.?\d*", carbs_str)[0])
                    except Exception:
                        carbs = 0.0
                        
                    if name and name.lower() not in seen_names and carbs >= 0:
                        seen_names.add(name.lower())
                        unified_foods.append({
                            "name": name,
                            "brand": "SBD / TACO",
                            "portion_size_g": 100.0,
                            "portion_description": portion,
                            "carbs_g": carbs,
                            "source": "SBD_TACO",
                            "country": "BR"
                        })
                        sbd_count += 1

print(f"   -> {sbd_count} alimentos brasileiros da SBD/TACO carregados.")

# -----------------------------------------------------------------------------
# FONTE 2: TBCA (Tabela Brasileira de Composição de Alimentos - USP/FoRC - Web Scraping)
# -----------------------------------------------------------------------------
print("\n2. Extraindo dados do Web Scraping da TBCA (data/tbca_scraped_foods.json)...")
tbca_path = "data/tbca_scraped_foods.json"
tbca_count = 0

if os.path.exists(tbca_path):
    with open(tbca_path, "r", encoding="utf-8") as f:
        tbca_data = json.load(f)
        for item in tbca_data:
            name = item.get("name")
            if name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                carbs = item.get("carbs_available_g", 0.0)
                unified_foods.append({
                    "name": name,
                    "brand": item.get("brand", "TBCA / USP"),
                    "portion_size_g": 100.0,
                    "portion_description": item.get("portion_description", "100g"),
                    "carbs_g": carbs,
                    "source": "TBCA_USP",
                    "country": "BR",
                    "code": item.get("code", "")
                })
                tbca_count += 1

print(f"   -> {tbca_count} alimentos oficiais da TBCA (USP) adicionados.")

# -----------------------------------------------------------------------------
# FONTE 3: Novo PDF: Tabelas complementares Perfil Carboidratos (USP)
# -----------------------------------------------------------------------------
print("\n3. Processando Novo PDF: Tabelas complementares Perfil Carboidratos (data/)...")
pdf_path = "data/Tabelas complementares _Perfil_Carboidratos_n.pdf"
pdf_count = 0

if os.path.exists(pdf_path):
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            text = page.extract_text()
            for line in text.split("\n"):
                if len(line) > 10 and not line.startswith("Vers") and not line.startswith("Tabelas"):
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        name_cand = " ".join(parts[:-1])
                        if name_cand and name_cand.lower() not in seen_names:
                            try:
                                val_str = parts[-1].replace(",", ".")
                                carbs_val = float(re.findall(r"\d+\.?\d*", val_str)[0])
                                seen_names.add(name_cand.lower())
                                unified_foods.append({
                                    "name": name_cand,
                                    "brand": "USP Perfil Carboidratos",
                                    "portion_size_g": 100.0,
                                    "portion_description": "100g",
                                    "carbs_g": carbs_val,
                                    "source": "USP_PDF",
                                    "country": "BR"
                                })
                                pdf_count += 1
                            except Exception:
                                pass
    except Exception as e:
        print(f"   -> Aviso PDF: {e}")

print(f"   -> {pdf_count} itens do perfil complementar extraidos do PDF.")

# -----------------------------------------------------------------------------
# FONTE 4: USDA Foundation Foods JSON (data/FoodData_Central_foundation_food_json_2026-04-30.json)
# -----------------------------------------------------------------------------
print("\n4. Extraindo dados do USDA Foundation Foods JSON (data/)...")
foundation_json_path = "data/FoodData_Central_foundation_food_json_2026-04-30.json"
found_count = 0

if os.path.exists(foundation_json_path):
    with open(foundation_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        foundation_items = data.get("FoundationFoods", [])
        for item in foundation_items:
            if not isinstance(item, dict):
                continue
            name = item.get("description")
            nutrients = item.get("foodNutrients", [])
            
            carbs = 0.0
            if isinstance(nutrients, list):
                for n in nutrients:
                    if isinstance(n, dict):
                        nutrient_info = n.get("nutrient", {})
                        if isinstance(nutrient_info, dict) and (nutrient_info.get("name") == "Carbohydrate, by difference" or nutrient_info.get("id") == 1005):
                            try:
                                carbs = float(n.get("amount", 0.0))
                            except (ValueError, TypeError):
                                carbs = 0.0
                            break
                        
            if name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                unified_foods.append({
                    "name": name,
                    "brand": "USDA Foundation",
                    "portion_size_g": 100.0,
                    "portion_description": "100g",
                    "carbs_g": carbs,
                    "source": "USDA_FOUNDATION",
                    "country": "US"
                })
                found_count += 1

print(f"   -> {found_count} alimentos base do USDA Foundation carregados.")

# -----------------------------------------------------------------------------
# FONTE 5: USDA FoodData Central CSV completo (data/FoodData_Central_csv_2026-04-30/)
# -----------------------------------------------------------------------------
print("\n5. Extraindo alimentos e marcas do USDA CSV (data/FoodData_Central_csv_2026-04-30/)...")
usda_food_path = "data/FoodData_Central_csv_2026-04-30/food.csv"
usda_nutrient_path = "data/FoodData_Central_csv_2026-04-30/food_nutrient.csv"

food_names = {}
if os.path.exists(usda_food_path):
    with open(usda_food_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_names[row.get("fdc_id")] = {
                "name": row.get("description"),
                "data_type": row.get("data_type", "USDA")
            }

csv_usda_count = 0
if os.path.exists(usda_nutrient_path):
    with open(usda_nutrient_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            count += 1
            if count % 5000000 == 0:
                print(f"   -> {count} linhas de nutrientes varridas...")
                
            if row.get("nutrient_id") == "1005":
                fdc_id = row.get("fdc_id")
                if fdc_id in food_names:
                    info = food_names[fdc_id]
                    name = info["name"]
                    if name and name.lower() not in seen_names:
                        seen_names.add(name.lower())
                        try:
                            carbs = float(row.get("amount", 0.0))
                        except (ValueError, TypeError):
                            carbs = 0.0
                            
                        unified_foods.append({
                            "name": name,
                            "brand": info["data_type"],
                            "portion_size_g": 100.0,
                            "portion_description": "100g",
                            "carbs_g": carbs,
                            "source": "USDA_CSV",
                            "country": "US"
                        })
                        csv_usda_count += 1

print(f"   -> {csv_usda_count} alimentos do USDA CSV adicionados.")
print(f"\nTOTAL UNIFICADO E CENTRALIZADO DE TODAS AS FONTES: {len(unified_foods)} ALIMENTOS!")

# -----------------------------------------------------------------------------
# GERAR ARQUIVO JSON CENTRALIZADO (Para consumo do Backend/App)
# -----------------------------------------------------------------------------
print(f"\n6. Salvando arquivo JSON unificado em '{OUTPUT_JSON_SEEDS}'...")
with open(OUTPUT_JSON_SEEDS, "w", encoding="utf-8") as out_json:
    json.dump(unified_foods, out_json, ensure_ascii=False, indent=2)

# -----------------------------------------------------------------------------
# GERAR ARQUIVO SQL SEED (Para o MySQL)
# -----------------------------------------------------------------------------
print(f"7. Salvando arquivo SQL Seed em '{OUTPUT_SQL_SEEDS}'...")
with open(OUTPUT_SQL_SEEDS, "w", encoding="utf-8") as out_sql:
    out_sql.write("-- =============================================================================\n")
    out_sql.write("-- SEED UNIFICADO E CENTRALIZADO DE ALIMENTOS (TODAS AS FONTES + TBCA USP)\n")
    out_sql.write(f"-- Total de alimentos: {len(unified_foods)}\n")
    out_sql.write("-- Fontes: TBCA (USP), SBD, TACO, Perfil Carboidratos PDF, USDA Foundation, USDA CSV\n")
    out_sql.write("-- =============================================================================\n\n")
    out_sql.write("INSERT INTO food_database (id, name, brand, portion_size_g, portion_description, carbs_per_portion, source, is_verified, is_active) VALUES\n")
    
    buffer = []
    for idx, f in enumerate(unified_foods):
        name_esc = escape_sql(f["name"])
        brand_esc = escape_sql(f["brand"])
        desc_esc = escape_sql(f["portion_description"])
        val_str = f"(UUID(), '{name_esc}', '{brand_esc}', {f['portion_size_g']}, '{desc_esc}', {f['carbs_g']}, '{f['source']}', TRUE, TRUE)"
        buffer.append(val_str)
        
        if len(buffer) >= 10000:
            out_sql.write(",\n".join(buffer) + ",\n")
            buffer = []

    if buffer:
        out_sql.write(",\n".join(buffer) + ";\n")

print("\nPROCESSO COMPLETO FINALIZADO COM SUCESSO!")
