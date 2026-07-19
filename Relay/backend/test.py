# =============================================
# БЛОК: ТЕСТ ВСЕХ НАШИХ СЕРВИСОВ
# =============================================

import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from foxreload import FoxReloadClient
from config import config


async def test_all_services():
    """Тестирование всех наших сервисов внутри gaming-services"""
    
    print("=" * 70)
    print("FoxReload - Тест всех игровых сервисов")
    print("=" * 70)
    
    async with FoxReloadClient(
        api_key=config.FOXRELOAD_API_KEY,
        base_url=config.FOXRELOAD_BASE_URL,
        language=config.FOXRELOAD_LANGUAGE,
        currency=config.FOXRELOAD_CURRENCY
    ) as client:
        
        # =============================================
        # 1. ПОЛУЧАЕМ ВСЕ ПОДКАТЕГОРИИ gaming-services
        # =============================================
        print("\n" + "=" * 70)
        print("1. ПОЛУЧЕНИЕ ПОДКАТЕГОРИЙ В gaming-services")
        print("=" * 70)
        
        try:
            # Получаем все подкатегории с товарами
            subcategories = await client.get_categories(
                parent_id_or_slug="gaming-services",
                limit=100,
                with_stock_only=True
            )
            
            print(f"\n✅ Найдено подкатегорий с товарами: {len(subcategories)}")
            
            # Наши целевые сервисы
            target_services = ["playstation", "steam", "xbox", "nintendo", "roblox"]
            found_services = {}
            
            print("\n📂 Найденные сервисы:")
            for sub in subcategories:
                name = sub.get('name', '').lower()
                slug = sub.get('slug', '').lower()
                
                # Проверяем, относится ли к нашим сервисам
                for target in target_services:
                    if target in name or target in slug:
                        found_services[target] = sub
                        print(f"   ✅ {sub.get('name')}")
                        print(f"      Slug: {slug}")
                        print(f"      ID: {sub.get('id')}")
                        print(f"      Товаров в наличии: {sub.get('inStockCount', 0)}")
                        print()
                        break
            
            if not found_services:
                print("⚠️ Ни один из целевых сервисов не найден в подкатегориях.")
                print("Возможно, они находятся глубже. Ищем дальше...")
            
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            return
        
        # =============================================
        # 2. ПОЛУЧАЕМ ТОВАРЫ ДЛЯ КАЖДОГО НАЙДЕННОГО СЕРВИСА
        # =============================================
        print("\n" + "=" * 70)
        print("2. ПОЛУЧЕНИЕ ТОВАРОВ (НОМИНАЛОВ) ДЛЯ СЕРВИСОВ")
        print("=" * 70)
        
        for service_name, service_data in found_services.items():
            service_slug = service_data.get('slug')
            print(f"\n🔍 Сервис: {service_name.upper()} ({service_slug})")
            
            try:
                # Получаем товары в категории сервиса
                products_result = await client.get_products_by_category(
                    service_slug,
                    limit=30,
                    with_stock_only=True
                )
                
                products = products_result.get('items', [])
                print(f"   Найдено товаров: {len(products)}")
                
                if products:
                    print(f"   Первые 3 товара (номиналы):")
                    for p in products[:3]:
                        # Извлекаем номинал из атрибутов или названия
                        attrs = p.get('attributes', {})
                        amount = attrs.get('amount', 'N/A')
                        currency = attrs.get('currency', '')
                        
                        print(f"      - {p.get('name', 'Без названия')[:40]}...")
                        print(f"        Номинал: {amount} {currency}")
                        print(f"        Цена: {p.get('price', 'N/A')} {p.get('currency', '')}")
                        print(f"        В наличии: {p.get('quantity', 0)}")
                        print(f"        ID: {p.get('id')}")
                        print()
                else:
                    # Если товаров нет, возможно, есть регионы
                    print(f"   ⚠️ Товаров нет. Проверяем регионы...")
                    
                    # Ищем подкатегории (регионы)
                    regions = await client.get_categories(
                        parent_id_or_slug=service_slug,
                        limit=50,
                        with_stock_only=True
                    )
                    
                    if regions:
                        print(f"   Найдено регионов: {len(regions)}")
                        for region in regions[:5]:
                            print(f"      - {region.get('name')} (товаров: {region.get('inStockCount', 0)})")
                            
                            # Получаем товары в регионе
                            region_products = await client.get_products_by_category(
                                region.get('slug'),
                                limit=10,
                                with_stock_only=True
                            )
                            
                            for p in region_products.get('items', [])[:2]:
                                attrs = p.get('attributes', {})
                                amount = attrs.get('amount', 'N/A')
                                currency = attrs.get('currency', '')
                                print(f"         - {p.get('name', '')[:30]}...")
                                print(f"           Номинал: {amount} {currency}")
                                print(f"           Цена: {p.get('price', 'N/A')} {p.get('currency', '')}")
                                print(f"           В наличии: {p.get('quantity', 0)}")
                    else:
                        print(f"   ❌ Нет товаров и регионов для {service_name}")
                        
            except Exception as e:
                print(f"   ❌ Ошибка получения товаров для {service_name}: {e}")
        
        # =============================================
        # 3. ПОИСК КОНКРЕТНЫХ ТОВАРОВ ПО НАЗВАНИЯМ
        # =============================================
        print("\n" + "=" * 70)
        print("3. ПОИСК КОНКРЕТНЫХ ТОВАРОВ ПО НАЗВАНИЯМ")
        print("=" * 70)
        
        search_queries = [
            "playstation store turkey",
            "playstation turkey",
            "steam wallet",
            "xbox gift card",
            "nintendo eshop",
            "roblox gift card"
        ]
        
        for query in search_queries:
            try:
                products = await client.search_products(query, limit=3, with_stock_only=True)
                if products:
                    print(f"\n🔍 '{query}': найдено {len(products)} товаров")
                    for p in products[:2]:
                        print(f"   - {p.get('name', 'Без названия')[:45]}...")
                        print(f"     Цена: {p.get('price', 'N/A')} {p.get('currency', '')}")
                        print(f"     В наличии: {p.get('quantity', 0)}")
                        print(f"     ID: {p.get('id')}")
                else:
                    print(f"\n🔍 '{query}': товаров не найдено")
            except Exception as e:
                print(f"\n🔍 '{query}': ошибка - {e}")
        
        print("\n" + "=" * 70)
        print("✅ ТЕСТ ЗАВЕРШЕН")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_all_services())