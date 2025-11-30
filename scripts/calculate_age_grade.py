import argparse
import json
import os
import sys
from datetime import datetime, timedelta

def load_data(json_path):
    try:
        with open(json_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find data file at {json_path}")
        sys.exit(1)

def parse_time(time_str):
    """Parse time string (HH:MM:SS or MM:SS) to seconds"""
    parts = time_str.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    else:
        try:
            return float(time_str)
        except ValueError:
            print("Error: Time must be in HH:MM:SS, MM:SS, or seconds format")
            sys.exit(1)

def interpolate(x, x0, x1, y0, y1):
    if x1 == x0:
        return y0
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0)

def find_bracketing_indices(distance, distances):
    if distance <= distances[0]:
        return 0, min(1, len(distances) - 1)
    if distance >= distances[-1]:
        return max(0, len(distances) - 2), len(distances) - 1
    
    for i in range(len(distances) - 1):
        if distances[i] <= distance <= distances[i+1]:
            return i, i + 1
    return 0, 1

def interpolate_by_distance(distance, distances, values):
    idx0, idx1 = find_bracketing_indices(distance, distances)
    if idx0 == idx1:
        return values[idx0]
    return interpolate(distance, distances[idx0], distances[idx1], values[idx0], values[idx1])

def calculate_age_grade(gender, age, distance_km, time_seconds, data):
    # Select gender data
    gender_data = data['men'] if gender.upper() == 'M' else data['women']
    
    # 1. Get Standard Time (Open Class)
    standard_seconds = interpolate_by_distance(distance_km, gender_data['distances'], gender_data['standards'])
    
    # 2. Get Age Factor
    # Clamp age
    clamped_age = max(5, min(100, age))
    age_key = str(int(clamped_age))
    
    # Get factors for the integer age
    if age_key not in gender_data['ageFactors']:
        print(f"Warning: No factors for age {age_key}, using 1.0")
        factor = 1.0
    else:
        factors = gender_data['ageFactors'][age_key]
        factor = interpolate_by_distance(distance_km, gender_data['distances'], factors)
        
        # Interpolate for fractional age if needed (not implemented in CLI for simplicity, assuming int age)
        # But if user passed float age, we could. For now, let's stick to integer age logic from the app.
    
    # 3. Calculate Age-Graded Time (Standard / Factor)
    # Actually, the formula is:
    # Runner Speed = Dist / Time
    # Standard Speed = Dist / Standard
    # Age Graded Standard Speed = Standard Speed * Factor
    # Percent = Runner Speed / Age Graded Standard Speed
    #         = (Dist / Time) / ((Dist / Standard) * Factor)
    #         = (Dist / Time) / (Dist / (Standard / Factor))  <-- Wait
    # Let's re-verify the formula from the TypeScript code:
    # ageGradedWRSpeed = (distanceKm * 1000) / standard * factor;
    # return runnerSpeed / ageGradedWRSpeed;
    
    # So:
    # Runner Speed = D / T
    # AG WR Speed = (D / Std) * Factor
    # Percent = (D/T) / ((D/Std) * Factor) = (Std / T) / Factor  <-- D cancels out!
    # Let's check:
    # Percent = (Standard / Time) / Factor ? 
    # No, wait.
    # Speed = Dist/Time.
    # WR Speed = Dist/Standard.
    # Age Factor usually reduces the WR Speed requirement? Or increases the time?
    # WAVA tables usually give factors < 1.0 for older ages (e.g. 0.8).
    # If factor is 0.8, it means you only need to run 80% as fast as the WR?
    # No, usually factor is used to calculate the "Age Standard Time".
    # Age Standard Time = Open Standard Time / Factor? Or Open Standard * Factor?
    # Let's look at the CSV.
    # Age 50 factor is ~0.9.
    # If WR is 100s. Age 50 WR should be slower, so time should be higher.
    # So Age Standard Time = 100s / 0.9 = 111s.
    # If I run 111s. My speed is D/111. WR speed is D/100.
    # My % should be 100% (or close to 1).
    # Formula: (D/111) / ( (D/100) * 0.9 ) = (1/111) / (0.9/100) = 100 / (111*0.9) = 100 / 99.9 ~= 1.
    # So the formula in TS:
    # ageGradedWRSpeed = (distanceKm * 1000) / standard * factor;
    # This means Age Graded WR Speed is LOWER than Open WR Speed (since factor < 1).
    # Correct.
    
    runner_speed = distance_km / time_seconds
    age_graded_wr_speed = (distance_km / standard_seconds) * factor
    
    percent = runner_speed / age_graded_wr_speed
    
    return percent, standard_seconds, factor

def main():
    parser = argparse.ArgumentParser(description='Calculate WAVA Age Grade')
    parser.add_argument('--gender', '-g', required=True, choices=['M', 'F', 'm', 'f'], help='Gender (M/F)')
    parser.add_argument('--age', '-a', required=True, type=float, help='Age')
    parser.add_argument('--dist', '-d', required=True, type=float, help='Distance in km')
    parser.add_argument('--time', '-t', required=True, help='Time (HH:MM:SS or MM:SS)')
    
    args = parser.parse_args()
    
    # Load data
    # Script is in trophy-app/scripts, data is in trophy-app/src/data
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, '..', 'src', 'data', 'wava-standards.json')
    data = load_data(json_path)
    
    # Parse time
    time_seconds = parse_time(args.time)
    
    # Calculate
    percent, standard, factor = calculate_age_grade(args.gender, args.age, args.dist, time_seconds, data)
    
    print(f"\n--- Age Grade Calculation ---")
    print(f"Runner: {args.gender.upper()}, Age {args.age}")
    print(f"Event: {args.dist} km in {args.time}")
    print(f"-----------------------------")
    print(f"Open Class Standard: {timedelta(seconds=int(standard))}")
    print(f"Age Factor:          {factor:.4f}")
    print(f"Age-Graded Percent:  {percent*100:.2f}%")
    print(f"-----------------------------")

if __name__ == '__main__':
    main()
