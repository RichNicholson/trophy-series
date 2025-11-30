import csv
import json

def extract_running_events(csv_path, gender):
    """Extract only running events from WAVA CSV file"""
    running_events = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)  # Skip header row
        
        # Headers: Event, dist(km), OC, 5, 6, 7, ..., 100
        # We want rows where dist(km) > 0 and event doesn't contain Walk/Hur/Jump/Throw/etc
        
        for row in reader:
            if len(row) < 4:
                continue
                
            event_name = row[1]  # Column B: Event
            dist_str = row[2]    # Column C: dist(km)
            
            # Skip if no distance
            if not dist_str or dist_str == '0':
                continue
            
            # Filter out non-running events
            exclude_keywords = ['Walk', 'Hur', 'Jump', 'Vault', 'Throw', 'Hammer', 
                              'Shot', 'Discus', 'Javelin', 'Weight', 'Steeple']
            
            if any(keyword in event_name for keyword in exclude_keywords):
                continue
            
            # This is a running event!
            dist_km = float(dist_str)
            standard_time = float(row[3])  # Column D: OC (Open Class standard)
            
            # Age factors from columns E onwards (ages 5-100)
            age_factors = []
            for i in range(4, min(len(row), 100)):  # Columns E to end
                if row[i] and row[i].strip():
                    try:
                        age_factors.append(float(row[i]))
                    except ValueError:
                        age_factors.append(1.0)  # Default to 1.0 if invalid
                else:
                    age_factors.append(1.0)
            
            running_events.append({
                'event': event_name,
                'distance_km': dist_km,
                'standard_seconds': standard_time,
                'age_factors': age_factors
            })
    
    return running_events

def create_json_structure(men_csv, women_csv, output_path):
    """Create final JSON structure"""
    men_events = extract_running_events(men_csv, 'M')
    women_events = extract_running_events(women_csv, 'F')
    
    # Sort by distance
    men_events.sort(key=lambda x: x['distance_km'])
    women_events.sort(key=lambda x: x['distance_km'])
    
    # Create aligned arrays
    men_data = {
        'distances': [e['distance_km'] for e in men_events],
        'standards': [e['standard_seconds'] for e in men_events],
        'ageFactors': {}
    }
    
    women_data = {
        'distances': [e['distance_km'] for e in women_events],
        'standards': [e['standard_seconds'] for e in women_events],
        'ageFactors': {}
    }
    
    # Populate age factors (ages 5-100)
    for age in range(5, 101):
        age_idx = age - 5  # Factor array starts at age 5
        men_data['ageFactors'][str(age)] = [e['age_factors'][age_idx] if age_idx < len(e['age_factors']) else 1.0 
                                             for e in men_events]
        women_data['ageFactors'][str(age)] = [e['age_factors'][age_idx] if age_idx < len(e['age_factors']) else 1.0 
                                               for e in women_events]
    
    final_data = {
        'men': men_data,
        'women': women_data
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Created {output_path}")
    print(f"Men: {len(men_events)} running events")
    print(f"Women: {len(women_events)} running events")
    print(f"\\nMen distances: {men_data['distances'][:10]}...")
    print(f"Women distances: {women_data['distances'][:10]}...")

if __name__ == '__main__':
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    create_json_structure(
        os.path.join(base_dir, '..', 'data_sources', 'men.csv'),
        os.path.join(base_dir, '..', 'data_sources', 'women.csv'),
        os.path.join(base_dir, '..', 'src', 'data', 'wava-standards.json')
    )
