import os
import replicate
import pandas as pd
import replicate

os.environ["REPLICATE_API_TOKEN"] = "API_KEY"

import math
def jaccard_similarity(x, y):
    if isinstance(x, list):
        x = ' '.join(map(str, x))
    if isinstance(y, list):
        y = ' '.join(map(str, y))
    
    x_set = set(x.split())
    y_set = set(y.split())
    
    intersection = x_set.intersection(y_set)
    
    numerator = sum([x.count(word) * y.count(word) for word in intersection])
    denominator = math.sqrt(sum([x.count(word)**2 for word in x_set])) * math.sqrt(sum([y.count(word)**2 for word in y_set]))
    
    if denominator == 0:
        return 0  # Return a specific value or handle the zero division case as per your requirements
    
    return numerator / denominator

def find_similar_image(image_path):
    temp_images_dir = "temp_images"
    if not os.path.exists(temp_images_dir):
        os.makedirs(temp_images_dir)

    df = pd.read_csv('ecom_output.csv')

    # Construct the local image URL
    with open(image_path, "rb") as image_file:
        output = replicate.run(
            "andreasjansson/blip-2:4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608",
            input={"image": image_file, "task": "visual_question_answering",
                "question": "How would you describe the item of clothing found in the image?"}
        )


    answer_text = output.replace("answer: ", "").strip()
    caption = answer_text

    query_string = caption
    df['similarity_score'] = df['full'].apply(lambda x: jaccard_similarity(x, query_string.lower()))

    most_similar_row = df.iloc[df['similarity_score'].idxmax()]
    most_similar_image_src = most_similar_row['Image Src']

    output_text = "Here is what I found: "
    return output_text, most_similar_image_src, most_similar_row['Title'], caption, most_similar_row['Image Src']
