# =============================================
# БЛОК: КОНФИГУРАЦИЯ СЕРВИСОВ
# =============================================

# Список валютных суффиксов для фильтрации дублей
CURRENCY_SUFFIXES = ["eur", "usd", "gbp", "cad", "aud", "brl", "jpy", "dkk", 
                     "nok", "sek", "chf", "pln", "hkd", "sgd", "myr", "mxn", 
                     "sar", "aed", "idr", "nzd", "rub"]

SERVICE_CATEGORIES = {
    "playstation": {
        "slug": "playstation",
        "name": "PlayStation",
        "icon": "playstation.png",
        "category_slug": "gaming-services",
        "category_id": "019ad428-eae3-7bc1-ab60-69b503ffa04f",
        "instruction": "После оплаты вы получите код активации. Перейдите на сайт PlayStation Store и активируйте код в разделе 'Обмен кода'.",
        "region_filters": {
            "exclude_names": ["PS Plus", "Plus"],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        }
    },
    "xbox": {
        "slug": "xbox",
        "name": "Xbox",
        "icon": "xbox.png",
        "category_slug": "gaming-services",
        "category_id": "019ad428-ee63-7dd0-a4cb-69040e7484c3",
        "instruction": "После оплаты вы получите код для Xbox. Активируйте код на сайте redeem.microsoft.com или в консоли Xbox.",
        "region_filters": {
            "exclude_names": ["Game Pass", "Pass"],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        }
    },
    "nintendo": {
        "slug": "nintendo",
        "name": "Nintendo",
        "icon": "nintendo.png",
        "category_slug": "gaming-services",
        "category_id": "019ad428-e9cd-7982-a6fa-0ec0eebce25d",
        "instruction": "После оплаты вы получите код для Nintendo eShop. Активируйте код в eShop на консоли Nintendo Switch.",
        "region_filters": {
            "exclude_names": ["Подписка"],
            "exclude_slugs": [],
            "exclude_currency_suffixes": True,
        }
    },
    "roblox": {
        "slug": "roblox",
        "name": "Roblox",
        "icon": "roblox.png",
        "category_slug": "game-currency",
        "category_id": "019ad428-e5b6-7a91-bcf0-7d7916d71397",
        "instruction": "После оплаты вы получите код Roblox Gift Card. Активируйте код на сайте roblox.com/redeem.",
        "region_filters": {
        "exclude_names": [],
        "exclude_slugs": ["convert", "north-america"],
        "exclude_currency_suffixes": False,         
        "deduplicate": True,                  
        "prefer_currency": "USD" 
    }
    },
    "apple": {
        "slug": "apple",
        "name": "Apple",
        "icon": "apple.png",
        "category_slug": "app-stores",
        "category_id": "019ad428-e7d9-7bc2-9eca-ddaeec623043",
        "instruction": "После оплаты вы получите код Apple Gift Card. Активируйте код в App Store или iTunes Store.",
        "region_filters": {
            "exclude_names": [],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        }
    },
    "google": {
        "slug": "google",
        "name": "Google Play",
        "icon": "google.png",
        "category_slug": "app-stores",
        "category_id": "019dbf2a-3ed1-7602-9c79-a7e366f76593",
        "instruction": "После оплаты вы получите код Google Play. Активируйте код в приложении Google Play или на сайте play.google.com/redeem.",
        "region_filters": {
            "exclude_names": [],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        }
    },
    "steam": {
    "slug": "steam",
    "name": "Steam",
    "icon": "steam.png",
    "category_slug": "steam-wallet",
    "category_id": "019e6a21-2e18-7851-a121-163ca0da5e9f",
    "instruction": "Пополнение Steam Wallet.",
    "region_filters": {
        "exclude_names": [],
        "exclude_slugs": [],
        "exclude_currency_suffixes": False,
        }
    },
    "netflix": {
    "slug": "netflix",
    "name": "Netflix",
    "icon": "netflix.png",
    "category_id": "019dbee3-2fb8-7a51-a751-f80f4ae41c36",  # ← ИЗМЕНИТЬ НА ЭТОТ ID
    "type": "subscription_gift",
    "instruction": "После оплаты вы получите код для пополнения баланса Netflix.",
    "region_filters": {
        "exclude_names": [],
        "exclude_slugs": [],
        "exclude_currency_suffixes": False,
    },
    "search_query": "netflix"
    },
    "spotify": {
        "slug": "spotify",
        "name": "Spotify",
        "icon": "spotify.png",
        "category_id": "019ea76e-b2f0-7de2-833c-9ec599ab7233",
        "type": "subscription_plan",
        "instruction": "После оплаты вы получите код для активации Spotify Premium.",
        "region_filters": {
            "exclude_names": [],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        },
        "search_query": "spotify"
    },
    "discord": {
        "slug": "discord",
        "name": "Discord",
        "icon": "discord.png",
        "category_id": "019ea76e-b2f0-7de2-833c-9ec599ab7233",
        "type": "discord",
        "instruction": "После оплаты вы получите код для активации Discord Nitro или Basic.",
        "region_filters": {
            "exclude_names": [],
            "exclude_slugs": [],
            "exclude_currency_suffixes": False,
        },
        "search_query": "discord"
    }
}


def get_all_services():
    return [
        {
            "slug": slug,
            "name": data["name"],
            "icon": data["icon"],
            "instruction": data["instruction"]
        }
        for slug, data in SERVICE_CATEGORIES.items()
    ]


def get_service(slug: str):
    return SERVICE_CATEGORIES.get(slug)


def get_region_filters(service_slug: str):
    """Получить правила фильтрации для сервиса"""
    service = SERVICE_CATEGORIES.get(service_slug)
    if service and "region_filters" in service:
        return service["region_filters"]
    return None