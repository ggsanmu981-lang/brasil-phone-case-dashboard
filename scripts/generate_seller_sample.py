# -*- coding: utf-8 -*-
"""Generate rich simulated Mercado Livre seller-backend data (orders / costs / ads / regions)."""
import json, random, csv
from datetime import date, timedelta

random.seed(20260818)

PRODUCTS = [
    # (sku, title, category, color, price, base_popularity, free_ship)
    ("CAP-IP15-SIL", "Capa de Celular iPhone 15 Silicone Fosca", "Silicone", "Preto", 24.9, 0.85, False),
    ("CAP-IP15-CRI", "Capa iPhone 15 Acrílico Cristal Transparente", "Cristal", "Transparente", 29.9, 0.72, False),
    ("CAP-IP16-MAG", "Capa iPhone 16 Silicone com MagSafe", "MagSafe", "Azul", 49.9, 0.60, True),
    ("CAP-IP14-COU", "Capa iPhone 14 Couro Sintético Premium", "Couro", "Marrom", 44.9, 0.50, True),
    ("CAP-IP13-SIL", "Capa iPhone 13 Silicone Colorida", "Silicone", "Rosa", 21.9, 0.68, False),
    ("CAP-IP12-TPU", "Capa iPhone 12 TPU Transparente", "TPU", "Transparente", 16.9, 0.55, False),
    ("CAP-IP11-SIL", "Capinha iPhone 11 Silicone Antichoque", "Silicone", "Preto", 15.9, 0.58, False),
    ("CAP-GA55-SIL", "Capa Galaxy A55 Silicone Fosca", "Silicone", "Verde", 22.9, 0.78, False),
    ("CAP-GA55-CRI", "Capa Galaxy A55 Cristal Ultra Fino", "Cristal", "Transparente", 26.9, 0.62, False),
    ("CAP-GA54-TPU", "Capa Galaxy A54 TPU Antirrisco", "TPU", "Cinza", 15.9, 0.45, False),
    ("CAP-GA56-MAG", "Capa Galaxy A56 com MagSafe", "MagSafe", "Roxo", 47.9, 0.30, True),
    ("CAP-GS25-COU", "Capa Galaxy S25 Ultra Couro Premium", "Couro", "Marrom", 69.9, 0.35, True),
    ("CAP-GS24-SIL", "Capa Galaxy S24 Silicone com Anel", "Silicone", "Azul", 29.9, 0.52, False),
    ("CAP-GS23-TPU", "Capa Galaxy S23 TPU Camuflada", "TPU", "Camuflado", 19.9, 0.28, False),
    ("CAP-RN14-SIL", "Capa Redmi Note 14 Silicone", "Silicone", "Preto", 18.9, 0.55, False),
    ("CAP-RN13-TPU", "Capa Redmi Note 13 TPU Cristal", "TPU", "Transparente", 14.9, 0.48, False),
    ("CAP-RN13-SUP", "Capa Redmi Note 13 com Suporte", "Com Suporte", "Preto", 32.9, 0.22, False),
    ("CAP-R12-SIL", "Capa realme 12 Silicone Fosca", "Silicone", "Branco", 20.9, 0.65, False),
    ("CAP-R11-PLU", "Capa realme 11 Pelúcia Fofinha", "Pelúcia", "Rosa", 34.9, 0.20, False),
    ("CAP-MG84-TPU", "Capa Moto G84 TPU Transparente", "TPU", "Transparente", 15.9, 0.40, False),
    ("CAP-MG85-SIL", "Capa Moto G85 Silicone Azul", "Silicone", "Azul", 19.9, 0.35, False),
    ("CAP-ME50-COU", "Capa Moto Edge 50 Couro Sintético", "Couro", "Marrom", 59.9, 0.25, True),
    ("CAP-IP15-PLU", "Capa iPhone 15 Pelúcia Colorida", "Pelúcia", "Rosa", 39.9, 0.30, False),
    ("CAP-GA55-SUP", "Capa Galaxy A55 com Suporte e Anel", "Com Suporte", "Preto", 35.9, 0.18, False),
    ("CAP-RN14-AGU", "Capa Redmi Note 14 À Prova d'Água", "À Prova d'Água", "Azul", 54.9, 0.15, True),
    ("CAP-IP16-CRI", "Capa iPhone 16 Cristal Espelhada", "Cristal", "Prata", 37.9, 0.45, False),
    ("CAP-GS25-SIL", "Capa Galaxy S25 Ultra Silicone MagSafe", "MagSafe", "Preto", 54.9, 0.42, True),
    ("CAP-IP12-PLU", "Capinha iPhone 12 Pelúcia", "Pelúcia", "Amarelo", 33.9, 0.12, False),
    ("CAP-R12-CRI", "Capa realme 12 Cristal Transparente", "Cristal", "Transparente", 24.9, 0.38, False),
    ("CAP-MG84-SUP", "Capa Moto G84 com Suporte", "Com Suporte", "Preto", 29.9, 0.10, False),
    ("CAP-IP16-PLU", "Capa iPhone 16 Pelúcia Colorida", "Pelúcia", "Verde", 41.9, 0.22, False),
    ("CAP-GA56-CRI", "Capa Galaxy A56 Cristal Espelhada", "Cristal", "Prata", 34.9, 0.33, False),
    ("CAP-RN14-PLU", "Capa Redmi Note 14 Pelúcia", "Pelúcia", "Rosa", 32.9, 0.16, False),
    ("CAP-GS24-COU", "Capa Galaxy S24 Couro Premium", "Couro", "Preto", 64.9, 0.28, True),
    ("CAP-IP13-MAG", "Capa iPhone 13 Silicone MagSafe", "MagSafe", "Branco", 44.9, 0.37, True),
    ("CAP-R12-SUP", "Capa realme 12 com Suporte", "Com Suporte", "Cinza", 33.9, 0.14, False),
    ("CAP-MG85-TPU", "Capa Moto G85 TPU Cinza", "TPU", "Cinza", 16.9, 0.30, False),
    ("CAP-IP15-AGU", "Capa iPhone 15 À Prova d'Água", "À Prova d'Água", "Preto", 57.9, 0.20, True),
    ("CAP-GA54-SIL", "Capa Galaxy A54 Silicone Vermelho", "Silicone", "Vermelho", 18.9, 0.42, False),
    ("CAP-R13C-SIL", "Capa Redmi 13C Silicone Azul", "Silicone", "Azul", 17.9, 0.36, False),
]

STATUS = [("Concluída", 0.86), ("Enviada", 0.05), ("Cancelada", 0.05), ("Devolvida", 0.02), ("Pendente", 0.02)]
PAYMENTS = [("Pix", 0.55), ("Cartão de crédito", 0.30), ("Boleto", 0.10), ("Cartão de débito", 0.05)]
CHANNELS = [("Orgânico", 0.66), ("Anúncios", 0.34)]

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

def pick_status():
    r = random.random(); acc = 0
    for name, p in STATUS:
        acc += p
        if r <= acc: return name
    return "Concluída"

def pick_payment():
    r = random.random(); acc = 0
    for name, p in PAYMENTS:
        acc += p
        if r <= acc: return name
    return "Pix"

def pick_channel():
    return random.choices([c[0] for c in CHANNELS], weights=[c[1] for c in CHANNELS])[0]

def pick_region():
    uf = random.choices(UF_KEYS, weights=UF_W)[0]
    return uf, random.choice(UF_CITIES[uf][1])

def main():
    today = date(2026, 8, 18)
    days = 180
    orders = []
    order_no = 1
    stock = {p[0]: random.randint(15, 250) for p in PRODUCTS}
    daily_views = {}

    for d in range(days, -1, -1):
        day = today - timedelta(days=d)
        for sku, title, cat, color, price, pop, freeship in PRODUCTS:
            views = int(random.uniform(15, 120) * pop * (0.6 + random.random()) * (2.2 if random.random() < 0.08 else 1.0))
            daily_views[sku] = views
            if random.random() > (0.12 + 0.55 * pop):
                continue
            n_orders = random.choices([1, 2, 3], weights=[0.70, 0.24, 0.06])[0]
            for _ in range(n_orders):
                qty = random.choices([1, 1, 1, 2, 3], weights=[0.58, 0.22, 0.10, 0.07, 0.03])[0]
                if stock[sku] <= 0:
                    qty = 1  # oversell edge case
                qty = max(1, qty)
                stock[sku] = max(0, stock[sku] - qty)
                shipping = 0.0 if (freeship or price >= 59.9) else random.choice([0.0, 12.9, 19.9])
                status = pick_status()
                payment = pick_payment()
                channel = pick_channel()
                uf, city = pick_region()
                # 成本与利润
                cost_unit = round(price * random.uniform(0.35, 0.50), 2)
                cost_total = round(cost_unit * qty, 2)
                shipping_cost = round(shipping * 0.7, 2)
                coupon = round(random.uniform(0, 5), 2) if random.random() < 0.12 else 0.0
                ad_spend = 0.0
                ad_imp = 0; ad_clicks = 0
                if channel == "Anúncios":
                    ad_spend = round(random.uniform(0.8, 4.5), 2)
                    ad_imp = random.randint(300, 3500)
                    ad_clicks = max(1, int(ad_imp * random.uniform(0.004, 0.03)))
                revenue = round(qty * price, 2)
                profit = round(revenue - cost_total - shipping_cost - ad_spend - coupon, 2)
                margin = round((profit / revenue) * 100, 1) if revenue else 0
                inst_count = random.choice([3, 6, 9, 12]) if (payment == "Cartão de crédito" and random.random() < 0.6) else None
                orders.append({
                    "order_id": f"MLB2026-{order_no:06d}",
                    "date": day.isoformat(),
                    "sku": sku,
                    "title": title,
                    "category": cat,
                    "color": color,
                    "qty": qty,
                    "unit_price": price,
                    "revenue": revenue,
                    "cost": cost_total,
                    "profit": profit,
                    "margin": margin,
                    "shipping_fee": shipping,
                    "shipping_cost": shipping_cost,
                    "coupon_discount": coupon,
                    "ad_spend": ad_spend,
                    "ad_impressions": ad_imp,
                    "ad_clicks": ad_clicks,
                    "channel": channel,
                    "payment": payment,
                    "installments_count": inst_count,
                    "status": status,
                    "views": views,
                    "stock": max(0, stock[sku]),
                    "state": uf,
                    "city": city,
                })
                order_no += 1

    orders.sort(key=lambda r: r["date"])

    with open("data/seller-sample-data.json", "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=1)
    with open("data/seller-sample-data.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(orders[0].keys()))
        w.writeheader()
        w.writerows(orders)

    total_rev = sum(r["revenue"] for r in orders)
    total_profit = sum(r["profit"] for r in orders)
    total_ad = sum(r["ad_spend"] for r in orders)
    print("orders:", len(orders), "| revenue: R$", round(total_rev, 2), "| profit: R$", round(total_profit, 2),
          "| ad spend: R$", round(total_ad, 2), "| products:", len(PRODUCTS))
    print("Sample:", json.dumps(orders[0], ensure_ascii=False))
    print("Fields:", list(orders[0].keys()))

if __name__ == "__main__":
    main()
