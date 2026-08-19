# -*- coding: utf-8 -*-
"""Generate rich sample data of phone cases sold on Mercado Livre (BR) and TikTok Shop (BR)."""
import json, random, re, csv
from datetime import date, timedelta

random.seed(20260818)

MODELS = [
    ("Apple", ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 16 Pro Max"]),
    ("Samsung", ["Galaxy S23", "Galaxy S24", "Galaxy S25", "Galaxy S25 Ultra", "Galaxy A15", "Galaxy A16", "Galaxy A35", "Galaxy A55", "Galaxy A56", "Galaxy M15", "Galaxy M35"]),
    ("Xiaomi", ["Redmi Note 12", "Redmi Note 13", "Redmi Note 14", "Redmi 13C", "Poco X6", "Poco X6 Pro", "Xiaomi 14"]),
    ("Motorola", ["Moto G54", "Moto G84", "Moto G85", "Moto G24", "Moto Edge 50"]),
    ("realme", ["realme C53", "realme 11", "realme 12", "realme Note 50"]),
]

MATERIALS = [
    ("Silicone", 15.9, ["Silicone", "Anti-Risco", "Antichoque", "Ultra Fino", "Transparente", "Fosca"]),
    ("TPU", 12.9, ["TPU", "Antichoque", "Transparente", "Fosca", "Ultra Fino"]),
    ("Policarbonato", 24.9, ["Capa Dura", "PC", "Antichoque", "Texturizada", "Fosca"]),
    ("Acrílico Cristal", 29.9, ["Cristal", "Transparente", "Antirrisco", "Ultra Fino"]),
    ("Couro Sintético", 39.9, ["Couro", "Premium", "Fosca", "Elegante"]),
    ("Silicone com MagSafe", 49.9, ["Magnética", "MagSafe", "Anti-Risco"]),
    ("Couro com MagSafe", 69.9, ["Couro Premium", "Magnética", "MagSafe"]),
    ("À Prova d'Água", 59.9, ["À Prova d'Água", "Silicone", "Antichoque"]),
    ("TPU com Cordão", 19.9, ["Com Cordão", "TPU", "Colorida"]),
    ("Pelúcia", 34.9, ["Pelúcia", "Fofinha", "Colorida"]),
    ("Silicone com Anel", 27.9, ["Com Anel", "Silicone", "Antichoque"]),
    ("Capa com Suporte", 32.9, ["Com Suporte", "Policarbonato", "Antichoque"]),
]
MATERIAL_MAP = {m[0]: m for m in MATERIALS}

SELLERS_ML = ["CelShop Brasil", "Case Store Brasil", "TecnoCases", "Importados BR", "Capinha Express",
              "Mega Cases Shop", "Prime Cases", "Brasil Case Center", "Top Cel Acessórios", "CaseHub",
              "Max Acessórios", "iCases Store", "Digital Case BR", "Acessórios Prime", "Case Mania"]
SELLERS_TT = ["PromoCase Brasil", "Loja da Capinha", "Viral Cases Shop", "TopTrend Acessórios", "Case Lovers BR",
              "Capinha da Moda", "Flash Cases", "Trendy Acessórios", "Casa das Capinhas", "Ofertas Case BR"]

FEATURES_EXTRA = ["Anti-Risco", "Antichoque", "Ultra Fino", "Transparente", "Fosca", "Colorida", "Camuflada",
                  "Floral", "Geométrica", "Com Desenho", "Espelhada", "Glitter", "Lisa", "Texturizada"]

COLORS = ["Preto", "Transparente", "Azul", "Rosa", "Vermelho", "Verde", "Branco", "Roxo", "Amarelo", "Cinza",
          "Camuflado", "Marrom", "Laranja", "Dourado", "Prata"]

# UF -> (weight, [cities])
UF_CITIES = {
    "SP": (0.30, ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Osasco"]),
    "MG": (0.12, ["Belo Horizonte", "Uberlândia", "Juiz de Fora", "Contagem"]),
    "RJ": (0.10, ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Campos dos Goytacazes"]),
    "PR": (0.08, ["Curitiba", "Londrina", "Maringá", "Cascavel"]),
    "SC": (0.06, ["Florianópolis", "Joinville", "Blumenau", "Chapecó"]),
    "RS": (0.06, ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas"]),
    "BA": (0.05, ["Salvador", "Feira de Santana", "Vitória da Conquista"]),
    "PE": (0.04, ["Recife", "Olinda", "Caruaru", "Petrolina"]),
    "CE": (0.04, ["Fortaleza", "Juazeiro do Norte", "Sobral"]),
    "GO": (0.03, ["Goiânia", "Aparecida de Goiânia", "Anápolis"]),
    "DF": (0.03, ["Brasília", "Taguatinga", "Ceilândia"]),
    "ES": (0.03, ["Vitória", "Vila Velha", "Serra"]),
    "AM": (0.02, ["Manaus", "Parintins"]),
    "PA": (0.02, ["Belém", "Ananindeua"]),
    "MA": (0.02, ["São Luís", "Imperatriz"]),
}
UF_KEYS = list(UF_CITIES.keys())
UF_W = [UF_CITIES[k][0] for k in UF_KEYS]

def pick_uf():
    uf = random.choices(UF_KEYS, weights=UF_W)[0]
    city = random.choice(UF_CITIES[uf][1])
    return uf, city

def clean(t):
    return re.sub(r"\s+", " ", t).strip()

def make_title(brand, model, material_label, feature_words, color):
    head = random.choice(["Capa de Celular", "Capinha", "Case", "Capa Protetora"])
    feats = random.sample(feature_words + FEATURES_EXTRA, random.randint(1, 2))
    feat_str = " ".join(feats)
    color_txt = color if random.random() < 0.55 else ""
    brand_txt = f" - {brand}" if random.random() < 0.7 else ""
    parts = [head, model, feat_str, material_label]
    if color_txt: parts.append(color_txt)
    if brand_txt: parts.append(brand_txt)
    return clean(" ".join(parts))

ROUNDED = [9.9, 12.9, 14.9, 15.9, 16.9, 17.9, 19.9, 21.9, 22.9, 24.9, 26.9, 27.9, 29.9,
           32.9, 34.9, 37.9, 39.9, 44.9, 49.9, 54.9, 59.9, 64.9, 69.9, 79.9, 89.9, 99.9]

def price_for(material, platform):
    base = MATERIAL_MAP[material][1]
    mult = random.uniform(0.85, 1.6) if platform == "ML" else random.uniform(0.55, 1.05)
    price = base * mult
    if random.random() < 0.4:
        price = random.choice(ROUNDED)
    return max(5.9, round(price, 1))

def sales_for(platform):
    shape = random.random()
    if platform == "ML":
        if shape < 0.45: return random.randint(0, 50)
        if shape < 0.75: return random.randint(50, 400)
        if shape < 0.92: return random.randint(400, 2000)
        if shape < 0.99: return random.randint(2000, 8000)
        return random.randint(8000, 25000)
    else:
        if shape < 0.35: return random.randint(0, 30)
        if shape < 0.60: return random.randint(30, 250)
        if shape < 0.80: return random.randint(250, 1200)
        if shape < 0.93: return random.randint(1200, 6000)
        if shape < 0.985: return random.randint(6000, 30000)
        return random.randint(30000, 120000)

def rating_for(platform, sales):
    mu = random.uniform(4.2, 4.9) if platform == "ML" else random.uniform(3.6, 4.9)
    if sales > 2000:
        mu = min(5.0, mu + 0.15)
    return round(max(3.0, min(5.0, mu + random.gauss(0, 0.25))), 1)

def reviews_for(platform, sales):
    ratio = random.uniform(0.02, 0.12) if platform == "ML" else random.uniform(0.005, 0.05)
    return max(0, int(sales * ratio))

def seller_type_for(platform):
    if platform == "ML":
        return random.choices(["MercadoLíder", "Loja Oficial", "Vendedor"], weights=[0.30, 0.12, 0.58])[0]
    return random.choices(["Top Seller", "Loja Oficial", "Vendedor"], weights=[0.25, 0.10, 0.65])[0]

def installments_for(platform, price):
    if platform == "ML" and random.random() < 0.72:
        cnt = random.choice([3, 6, 9, 12])
        free = random.random() < 0.7
        return {"count": cnt, "value": round(price / cnt, 2), "interest_free": free}
    if platform == "TT" and random.random() < 0.5:
        cnt = random.choice([3, 6])
        free = random.random() < 0.4
        return {"count": cnt, "value": round(price / cnt, 2), "interest_free": free}
    return None

def main():
    records = []
    idx = 1
    for platform, n in [("ML", 620), ("TT", 420)]:
        for _ in range(n):
            brand, models = random.choice(MODELS)
            model = random.choice(models)
            material = random.choice([m[0] for m in MATERIALS])
            feat_words = MATERIAL_MAP[material][2]
            color = random.choice(COLORS)
            title = make_title(brand, model, material, feat_words, color)
            price = price_for(material, platform)
            orig = round(price * random.uniform(1.2, 1.8), 1) if random.random() < 0.6 else None
            sales = sales_for(platform)
            rating = rating_for(platform, sales)
            reviews = reviews_for(platform, sales)
            seller = random.choice(SELLERS_ML if platform == "ML" else SELLERS_TT)
            uf, city = pick_uf()
            inst = installments_for(platform, price)
            records.append({
                "id": f"{'MLB' if platform=='ML' else 'TTS'}-{idx:04d}",
                "platform": "Mercado Livre" if platform == "ML" else "TikTok Shop",
                "title": title,
                "brand": brand,
                "model": model,
                "material": material,
                "color": color,
                "condition": "Novo" if random.random() < 0.99 else "Usado",
                "price_brl": price,
                "original_price_brl": orig,
                "sales": sales,
                "rating": rating,
                "reviews": reviews,
                "seller": seller,
                "seller_type": seller_type_for(platform),
                "state": uf,
                "city": city,
                "shipping_free": random.random() < (0.6 if platform == "ML" else 0.35),
                "installments_count": inst["count"] if inst else None,
                "interest_free": inst["interest_free"] if inst else None,
                "available_quantity": random.randint(0, 300) if random.random() < 0.97 else 0,
                "listed_date": (date(2026, 8, 18) - timedelta(days=random.randint(0, 400))).isoformat(),
            })
            idx += 1

    records.sort(key=lambda r: (r["platform"], -r["sales"]))

    with open("data/sample-data.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=1)
    with open("data/sample-data.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        w.writeheader()
        w.writerows(records)

    print("Generated", len(records), "records")
    ml = [r for r in records if r["platform"] == "Mercado Livre"]
    tt = [r for r in records if r["platform"] == "TikTok Shop"]
    print("ML:", len(ml), "| TT:", len(tt))
    print("Sample:", json.dumps(records[0], ensure_ascii=False))
    print("Fields:", list(records[0].keys()))

if __name__ == "__main__":
    main()
