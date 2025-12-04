from pyalex import Works, config
from typing import List, Dict
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
import time
from threading import Thread, Lock
from queue import Queue

load_dotenv()

config.email = os.getenv('OPENALEX_EMAIL', 'arunsisarrancs@gmail.com')

DATA_DIR = "data"
COUNTRIES_DIR = os.path.join(DATA_DIR, "countries")
os.makedirs(COUNTRIES_DIR, exist_ok=True)

print_lock = Lock()
progress = {'completed': 0, 'total': 0, 'failed': 0}

def get_top_countries_by_research(domain_id=3, top_n=100):
    print("Fetching top countries by research activity...")
    try:
        grouped_results = Works().filter(
            **{'topics.domain.id': domain_id}
        ).group_by('authorships.institutions.country_code').get()

        countries_list = []
        for group in grouped_results:
            if group.get('key') and group.get('key_display_name'):
                country_code = group['key'].split('/')[-1] if '/' in group['key'] else group['key']
                if country_code and len(country_code) == 2:
                    countries_list.append({
                        'code': country_code.upper(),
                        'name': group['key_display_name'],
                        'works_count': group['count']
                    })

        countries_list.sort(key=lambda x: x['works_count'], reverse=True)
        return countries_list[:top_n]
    except Exception as e:
        print(f"Error getting top countries: {e}")
        return []

def get_top_subfields_by_country(domain_id, country_code, top_n=10):
    try:
        grouped_results = Works().filter(
            **{
                'topics.domain.id': domain_id,
                'authorships.institutions.country_code': country_code
            }
        ).group_by('topics.subfield.id').get()

        subfields_list = []
        for group in grouped_results:
            if group.get('key') and group.get('key_display_name'):
                subfields_list.append({
                    'id': group['key'].split('/')[-1],
                    'name': group['key_display_name'],
                    'works_count': group['count']
                })

        subfields_list.sort(key=lambda x: x['works_count'], reverse=True)
        return subfields_list[:top_n]
    except Exception as e:
        with print_lock:
            print(f"  Error getting subfields for {country_code}: {e}")
        return []

def get_top_topics_for_subfield_by_country(domain_id, subfield_id, country_code, top_n=5):
    try:
        grouped_results = Works().filter(
            **{
                'topics.domain.id': domain_id,
                'topics.subfield.id': subfield_id,
                'authorships.institutions.country_code': country_code
            }
        ).group_by('topics.id').get()

        topics_list = []
        for group in grouped_results:
            if group.get('key') and group.get('key_display_name'):
                topics_list.append({
                    'id': group['key'].split('/')[-1],
                    'name': group['key_display_name'],
                    'works_count': group['count']
                })

        topics_list.sort(key=lambda x: x['works_count'], reverse=True)
        return topics_list[:top_n]
    except Exception as e:
        return []

def country_data_exists(country_code):
    country_dir = os.path.join(COUNTRIES_DIR, country_code)
    subfields_path = os.path.join(country_dir, 'subfields.csv')
    topics_path = os.path.join(country_dir, 'topics.csv')
    return os.path.exists(subfields_path) and os.path.exists(topics_path)

def save_country_data(country_code, subfields_data, topics_data):
    country_dir = os.path.join(COUNTRIES_DIR, country_code)
    os.makedirs(country_dir, exist_ok=True)

    if subfields_data:
        subfields_df = pd.DataFrame(subfields_data)
        subfields_df['fetch_date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subfields_path = os.path.join(country_dir, 'subfields.csv')
        subfields_df.to_csv(subfields_path, index=False)

    if topics_data:
        topics_df = pd.DataFrame(topics_data)
        topics_df['fetch_date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        topics_path = os.path.join(country_dir, 'topics.csv')
        topics_df.to_csv(topics_path, index=False)

def process_country(country_info, domain_id, idx, total):
    country_code = country_info['code']

    if country_data_exists(country_code):
        with print_lock:
            progress['completed'] += 1
            print(f"[{progress['completed']}/{total}] Skipped {country_code} (already exists)")
        return

    try:
        with print_lock:
            print(f"[{idx}/{total}] Processing {country_code} ({country_info['works_count']:,} works)...")

        subfields = get_top_subfields_by_country(domain_id, country_code, top_n=10)

        if not subfields:
            with print_lock:
                progress['failed'] += 1
                print(f"  No subfields found for {country_code}")
            return

        all_topics = []
        for i, subfield in enumerate(subfields, 1):
            subfield_id = subfield['id']
            topics = get_top_topics_for_subfield_by_country(
                domain_id, subfield_id, country_code, top_n=5
            )

            for topic in topics:
                topic['subfield_id'] = subfield_id
                topic['subfield_name'] = subfield['name']
                all_topics.append(topic)

            time.sleep(0.3)

        save_country_data(country_code, subfields, all_topics)

        with print_lock:
            progress['completed'] += 1
            print(f"  ✓ Saved {len(subfields)} subfields, {len(all_topics)} topics for {country_code}")

        time.sleep(0.5)

    except Exception as e:
        with print_lock:
            progress['failed'] += 1
            print(f"  ✗ Error processing {country_code}: {e}")

def worker(queue, domain_id, total):
    while True:
        item = queue.get()
        if item is None:
            break

        idx, country_info = item
        process_country(country_info, domain_id, idx, total)
        queue.task_done()

def fetch_all_countries_data(domain_id=3, num_threads=5):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("=" * 80)
    print(f"FETCHING COUNTRY DATA FROM OPENALEX API")
    print(f"Timestamp: {timestamp}")
    print("=" * 80)

    print("\nStep 1: Getting top 100 countries by research activity...")
    countries = get_top_countries_by_research(domain_id, top_n=100)

    if not countries:
        print("Error: Could not fetch countries list")
        return

    print(f"Found {len(countries)} countries")
    top5_str = ', '.join([f"{c['code']} ({c['works_count']:,})" for c in countries[:5]])
    print(f"Top 5: {top5_str}")

    existing_count = sum(1 for c in countries if country_data_exists(c['code']))
    print(f"Already processed: {existing_count}/{len(countries)}")

    countries_to_process = [c for c in countries if not country_data_exists(c['code'])]
    print(f"Countries to process: {len(countries_to_process)}")

    if not countries_to_process:
        print("\nAll countries already processed!")
        return

    print(f"\nStep 2: Processing countries with {num_threads} threads...")
    print("=" * 80)

    progress['total'] = len(countries)
    progress['completed'] = existing_count
    progress['failed'] = 0

    queue = Queue()

    for idx, country in enumerate(countries, 1):
        queue.put((idx, country))

    threads = []
    for _ in range(num_threads):
        t = Thread(target=worker, args=(queue, domain_id, len(countries)))
        t.start()
        threads.append(t)

    for _ in range(num_threads):
        queue.put(None)

    for t in threads:
        t.join()

    print("\n" + "=" * 80)
    print("DATA FETCH COMPLETE")
    print(f"Completed: {progress['completed']}/{progress['total']}")
    print(f"Failed: {progress['failed']}")
    print("=" * 80)

if __name__ == "__main__":
    fetch_all_countries_data(domain_id=3, num_threads=5)
