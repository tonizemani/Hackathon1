from io import BytesIO
import base64
import random
import string
from PIL import Image
from flask import Flask, render_template, request, jsonify
import pandas as pd
from visual_search1 import find_similar_image
from sentence_transformers import SentenceTransformer, util
from collections import defaultdict

app = Flask(__name__)


model = SentenceTransformer('distilbert-base-nli-stsb-mean-tokens')

visited_rows = defaultdict(list)
search_count = defaultdict(int)

def jaccard_similarity(x, y):
    if isinstance(x, list):
        x = ' '.join(map(str, x))
    if isinstance(y, list):
        y = ' '.join(map(str, y))

    sentence_embeddings = model.encode([x, y])

    # Compute cosine similarity
    similarity_score = util.cos_sim(sentence_embeddings[0].reshape(1, -1), sentence_embeddings[1].reshape(1, -1))

    return similarity_score.item()

@app.route("/")
def home():
    return render_template("e_index2.html")

@app.route("/abstract_search", methods=["POST"])
def abstract_search():
    df = pd.read_csv("ecom_output.csv")
    df['full'] = df['full'].apply(lambda x: str(x).lower().split())
    query_string = request.form["query_string"]
    df['similarity_score'] = df['full'].apply(lambda x: jaccard_similarity(x, query_string.lower().split()))
    most_similar_row = df.iloc[df['similarity_score'].idxmax()]
    result = {
        "title": most_similar_row['Title'],
        "image_src": most_similar_row['Image Src']
    }

    return jsonify(result)

@app.route('/visual_search', methods=['POST'])
def visual_search():
    base64_image = request.form['image']


    img = base64.b64decode(base64_image)
    img = Image.open(BytesIO(img)).convert('RGB')

    
    random_string = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    filename = f"{random_string}.jpg"


    temp_images_dir = "temp_images"
    if not os.path.exists(temp_images_dir):
        os.makedirs(temp_images_dir)

    img_path = os.path.join(temp_images_dir, filename)
    img.save(img_path)
    results = find_similar_image(img_path)  # Pass the image path directly
    os.remove(img_path)

    return jsonify({"text": results[0], "image_link": results[1], "title": results[2], "caption": results[3]})

def t_tag_search():
    input_file = 'ecom_output.csv'
    output_file = 'tag_search_output.txt'
    try:
        with open(output_file, 'r') as f:
            return f.read()
    except FileNotFoundError:
        df = pd.read_csv(input_file)

        start_index = df.columns.get_loc("Variant Tax Code")
        end_index = df.columns.get_loc("full")

        columns = df.columns[start_index + 1:end_index]

        unique_values = {}
        for col in columns:
            unique_values[col] = sorted(set(df[col].dropna()))

        bullet_points = []
        for col, values in unique_values.items():
            bullet_points.append(f'{col}:\n' + '\n'.join([f'• {value}' for value in values]))

        formatted_text = '\n\n'.join(bullet_points)

        with open(output_file, 'w') as f:
            f.write(formatted_text)

        return formatted_text

@app.route('/tag_search', methods=['POST'])
def tag_search():
    formatted_text = t_tag_search()
    formatted_text = formatted_text.replace('\u2022', '').replace(':', '').split('\n\n')
    tag_groups = [{'title': group.split('\n')[0], 'items': group.split('\n')[1:]} for group in formatted_text]
    

    plain_text_output = ""
    for group in tag_groups:
        plain_text_output += f"{group['title']}:\n"
        for item in group['items']:
            plain_text_output += f"{item.strip()}\n"
        plain_text_output += "\n"

    return plain_text_output.strip()

@app.route("/product_search", methods=["POST"])
def product_search():
    global visited_rows
    global search_count

    df = pd.read_csv("ecom_output.csv")
    df['full'] = df['full'].apply(lambda x: str(x).lower().split())
    query_string = request.form["query_string"]
    df['similarity_score'] = df['full'].apply(lambda x: jaccard_similarity(x, query_string.lower().split()))

    if query_string not in visited_rows:
        visited_rows[query_string] = []


    unvisited_df = df.loc[~df.index.isin(visited_rows[query_string])]

    if not unvisited_df.empty:
        most_similar_row = unvisited_df.iloc[unvisited_df['similarity_score'].idxmax()]
        visited_rows[query_string].append(most_similar_row.name)
    else:
        # If all rows have been visited, reset the visited rows for the query_string and return the most similar row
        visited_rows[query_string] = []
        most_similar_row = df.iloc[df['similarity_score'].idxmax()]
        visited_rows[query_string].append(most_similar_row.name)


    search_count[query_string] += 1


    if search_count[query_string] == 1:
        visited_rows[query_string].append(most_similar_row.name)
        unvisited_df = df.loc[~df.index.isin(visited_rows[query_string])]
        most_similar_row = unvisited_df.iloc[unvisited_df['similarity_score'].idxmax()]
        visited_rows[query_string].append(most_similar_row.name)

    result = {
        "title": most_similar_row['Title'],
        "image_src": most_similar_row['Image Src'],
        "link": most_similar_row['Image Src']
    }

    return result

if __name__ == "__main__":
    app.run()
