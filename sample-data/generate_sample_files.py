"""
Generate sample Excel files for testing the Rompit OE admin panel.
This script creates:
1. users_sample.xlsx - Sample user data with User ID and Date of Birth
2. exam_sample.xlsx - Sample exam data with questions across multiple sections
"""

import pandas as pd
import os

# Create sample-data directory if it doesn't exist
sample_dir = os.path.join('sample-data')
if not os.path.exists(sample_dir):
    os.makedirs(sample_dir)

# 1. Create users_sample.xlsx
users_data = {
    'user_id': ['test123', 'admin', 'student001', 'student002', 'student003'],
    'dob': ['2000-01-01', '1990-01-01', '2001-05-15', '2002-07-22', '2000-12-31'],
    'name': ['Test User', 'Admin User', 'John Doe', 'Jane Smith', 'Bob Johnson']
}

users_df = pd.DataFrame(users_data)
users_file_path = os.path.join(sample_dir, 'users_sample.xlsx')
users_df.to_excel(users_file_path, index=False)
print(f"Created {users_file_path}")

# 2. Create exam_sample.xlsx with multiple sheets

# Physics questions
physics_data = {
    'question': [
        "What is Newton's first law?",
        "What is the unit of force?",
        "What is the SI unit of electric current?",
        "Which of the following is a vector quantity?",
        "What is the speed of light in vacuum?",
        "What does Ohm's law state?",
        "Which law of thermodynamics states that energy cannot be created or destroyed?",
        "What is the formula for kinetic energy?",
        "Which scientist proposed the theory of relativity?",
        "What is the acceleration due to gravity on Earth's surface?"
    ],
    'option_a': [
        "Law of inertia",
        "Joule",
        "Volt",
        "Temperature",
        "300,000 km/s",
        "V = IR",
        "Zeroth law",
        "KE = mv",
        "Isaac Newton",
        "9.8 m/s²"
    ],
    'option_b': [
        "Law of acceleration",
        "Newton",
        "Watt",
        "Time",
        "340 m/s",
        "P = VI",
        "First law",
        "KE = m²v",
        "Albert Einstein",
        "10 m/s²"
    ],
    'option_c': [
        "Law of action and reaction",
        "Watt",
        "Ampere",
        "Distance",
        "3 × 10⁸ m/s",
        "F = ma",
        "Second law",
        "KE = ½mv²",
        "Niels Bohr",
        "9.1 m/s²"
    ],
    'option_d': [
        "Law of gravitation",
        "Pascal",
        "Ohm",
        "Mass",
        "2.99 × 10⁸ m/s",
        "F = G(m₁m₂)/r²",
        "Third law",
        "KE = m/v",
        "James Maxwell",
        "8.9 m/s²"
    ],
    'correct_answer': ['A', 'B', 'C', 'A', 'C', 'A', 'B', 'C', 'B', 'A']
}

# Chemistry questions
chemistry_data = {
    'question': [
        "What is the atomic number of Oxygen?",
        "Which of the following is a noble gas?",
        "What is the pH of a neutral solution at 25°C?",
        "What is the chemical formula for water?",
        "Which of the following is NOT a state of matter?",
        "What is the most abundant element in the Earth's crust?",
        "What is the process of converting a solid directly to gas called?",
        "Which element has the symbol 'Na'?",
        "What type of bond is formed when electrons are shared?",
        "Which of these is an example of a chemical change?"
    ],
    'option_a': [
        "6",
        "Hydrogen",
        "0",
        "H₂O",
        "Solid",
        "Oxygen",
        "Melting",
        "Nitrogen",
        "Ionic bond",
        "Melting ice"
    ],
    'option_b': [
        "7",
        "Nitrogen",
        "7",
        "CO₂",
        "Liquid",
        "Silicon",
        "Evaporation",
        "Sodium",
        "Covalent bond",
        "Dissolving salt in water"
    ],
    'option_c': [
        "8",
        "Helium",
        "14",
        "H₂O₂",
        "Gas",
        "Aluminum",
        "Sublimation",
        "Neon",
        "Metallic bond",
        "Rusting of iron"
    ],
    'option_d': [
        "9",
        "Chlorine",
        "1",
        "H₃O",
        "Energy",
        "Iron",
        "Condensation",
        "Nickel",
        "Hydrogen bond",
        "Cutting paper"
    ],
    'correct_answer': ['C', 'C', 'B', 'A', 'D', 'B', 'C', 'B', 'B', 'C']
}

# Mathematics questions
mathematics_data = {
    'question': [
        "What is the derivative of x² with respect to x?",
        "What is the value of π (pi) to two decimal places?",
        "Which of the following is not a prime number?",
        "What is the formula for the area of a circle?",
        "What is the sum of the angles in a triangle?",
        "What is 5! (5 factorial)?",
        "What is the square root of 144?",
        "In statistics, what is the middle value in a data set called?",
        "What is the value of log₁₀(100)?",
        "What is the formula for the Pythagorean theorem?"
    ],
    'option_a': [
        "x",
        "3.14",
        "3",
        "πr",
        "90°",
        "25",
        "12",
        "Mean",
        "10",
        "a² + b² = c²"
    ],
    'option_b': [
        "2x",
        "3.41",
        "7",
        "2πr",
        "180°",
        "120",
        "14",
        "Median",
        "100",
        "a + b + c = 0"
    ],
    'option_c': [
        "x²",
        "3.12",
        "9",
        "πr²",
        "270°",
        "15",
        "10",
        "Mode",
        "2",
        "a × b = c"
    ],
    'option_d': [
        "2x²",
        "3.16",
        "11",
        "2πr²",
        "360°",
        "5",
        "11",
        "Range",
        "1",
        "a² - b² = c²"
    ],
    'correct_answer': ['B', 'A', 'C', 'C', 'B', 'B', 'A', 'B', 'C', 'A']
}

# Create the Excel writer
exam_file_path = os.path.join(sample_dir, 'exam_sample.xlsx')
with pd.ExcelWriter(exam_file_path) as writer:
    # Write each subject to a different sheet
    pd.DataFrame(physics_data).to_excel(writer, sheet_name='Physics', index=False)
    pd.DataFrame(chemistry_data).to_excel(writer, sheet_name='Chemistry', index=False)
    pd.DataFrame(mathematics_data).to_excel(writer, sheet_name='Mathematics', index=False)

print(f"Created {exam_file_path}")

print("Sample Excel files generated successfully!")