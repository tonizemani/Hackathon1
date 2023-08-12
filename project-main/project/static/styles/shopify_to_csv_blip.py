import os
import requests
from PIL import Image
from io import BytesIO
import pandas as pd
import replicate

os.environ["REPLICATE_API_TOKEN"] = "bae11638738eff7104b8f9056c4f668ff57ba116"

# Set the input CSV file and output CSV file
input_csv = r"C:\Users\User\Downloads\product-csvs-master\product-csvs-master\apparel.csv"
output_csv = "ecom_output.csv"

# Define the questions for visual_question_answering task
questions = [
    "How would you describe the item of clothing is found in the image?",
    "What are the main colors of the item?",
    "What is the vibe of this item of clothing?",
    "What is the occasion of wearing this for e.g. Casual, Formal, Business, Party, Cocktail, Wedding, Sportswear, Loungewear, Beachwear or none?",
    "What is the material or fabric used in the clothing item? (e.g., cotton, silk, wool, polyester, denim, leather, suede, velvet, lace, chiffon, linen, nylon, rayon, spandex, or synthetic)",
    "What is the print in this item of clothing if there is any? (e.g., stripes, polka dots, floral, plaid, paisley, geometric, animal print, solid, etc.)",
    "Are there any special features or embellishments on the clothing item? (e.g., buttons, zippers, embroidery or none)",
    "What is the pattern or print on the clothing item if any? (e.g., stripes, polka dots, floral, plaid, paisley, geometric, animal print, solid or none)",
    "What is the occasion of wearing for this item?(e.g., Casual, Formal, Business, Party, Cocktail, Wedding, Sportswear,Beachwear, Loungewear, or none)",
    "What is the seasonality of the clothing item? (e.g., spring, summer, fall, winter)"
]

def is_image_url_valid(url):
    try:
        response = requests.get(url)
        Image.open(BytesIO(response.content)).verify()
        return True
    except Exception:
        return False

# Read the input CSV file into a pandas dataframe
df = pd.read_csv(input_csv)

# Create new columns for the results
for i in range(len(questions)):
    df[f"Answer {i + 1}"] = ""
df["full"] = ""

# Process the images in the "Image src" column
for index, row in df.iterrows():
    image_url = row["Image Src"]

    if not is_image_url_valid(image_url):
        print(f"Skipping invalid image URL: {image_url}")
        continue


    # Run visual_question_answering task for each question
    answers = []
    for question in questions:
        output_vqa = replicate.run(
            "salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746",
            input={"image": image_url, "task": "visual_question_answering", "question": question}
        )
        answer_text = output_vqa.replace("answer: ", "").strip()
        answers.append(answer_text)

    # Join all answers together into a single string for the "full" column
    full_text = " ".join(answers)
    

    # Update the dataframe with the results
    for i, answer in enumerate(answers):
        df.at[index, f"Answer {i + 1}"] = answer
    df.at[index, "full"] = full_text

# Save the updated dataframe to the output CSV file
df.to_csv(output_csv, index=False)
