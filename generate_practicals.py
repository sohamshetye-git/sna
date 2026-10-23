import os
import json
import re

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
dl_dir = os.path.join(ROOT_DIR, "dl_code")
out_json_path = os.path.join(ROOT_DIR, "practicals.json")
out_js_path = os.path.join(ROOT_DIR, "practicals_data.js")

notebook_meta = {
    "autoencoder.ipynb": {
        "cleanName": "autoencoder",
        "title": "Practical 1: Autoencoder - Reconstruction & Denoising",
        "order": 1
    },
    "autoenoder_dl.ipynb": {
        "cleanName": "autoenoder_dl",
        "title": "Practical 2: Deep Autoencoder & MNIST Classification",
        "order": 2
    },
    "cnn.ipynb": {
        "cleanName": "cnn",
        "title": "Practical 3: CNN - Convolutional Neural Networks",
        "order": 3
    },
    "dl_architecture_all (1).ipynb": {
        "cleanName": "dl_architecture_all",
        "title": "Practical 4: DL Architectures - Sequential & Functional",
        "order": 4
    },
    "mlp.ipynb": {
        "cleanName": "mlp",
        "title": "Practical 5: MLP - Multilayer Perceptron",
        "order": 5
    },
    "rnn_dl (1).ipynb": {
        "cleanName": "rnn_dl",
        "title": "Practical 6: RNN & LSTM - Sequence & Sentiment Analysis",
        "order": 6
    }
}

ansi_regex = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')

def clean_ansi(text):
    if not text:
        return ""
    return ansi_regex.sub("", text)

practicals = []

if not os.path.exists(dl_dir):
    raise FileNotFoundError(f"dl_code directory not found at {dl_dir}")

all_files = [f for f in os.listdir(dl_dir) if f.endswith(".ipynb")]

def get_order(fname):
    if fname in notebook_meta:
        return notebook_meta[fname]["order"]
    return 99

for filename in sorted(all_files, key=get_order):
    filepath = os.path.join(dl_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        nb_json = json.load(f)

    meta = notebook_meta.get(filename, {
        "cleanName": filename.replace(".ipynb", ""),
        "title": filename.replace(".ipynb", "").replace("_", " ").title()
    })

    raw_cells = nb_json.get("cells", [])
    processed_cells = []

    for c in raw_cells:
        cell_type = c.get("cell_type", "code")
        source = c.get("source", "")
        if isinstance(source, list):
            source = "".join(source)

        execution_count = c.get("execution_count")
        raw_outputs = c.get("outputs", [])
        processed_outputs = []

        for out in raw_outputs:
            ot = out.get("output_type")
            data = out.get("data", {})

            # 1. Image
            if "image/png" in data:
                img_data = data["image/png"]
                if isinstance(img_data, list):
                    img_data = "".join(img_data)
                img_data = img_data.replace("\n", "").strip()
                processed_outputs.append({
                    "type": "image",
                    "data": img_data
                })

            # 2. Stream
            elif ot == "stream":
                txt = out.get("text", "")
                if isinstance(txt, list):
                    txt = "".join(txt)
                txt = clean_ansi(txt)
                if txt.strip():
                    processed_outputs.append({
                        "type": "stream",
                        "text": txt
                    })

            # 3. Rich text
            elif "text/plain" in data:
                txt = data.get("text/plain", "")
                if isinstance(txt, list):
                    txt = "".join(txt)
                txt = clean_ansi(txt)
                if txt.strip() and not (txt.strip().startswith("<Figure size") and "Axes>" in txt):
                    processed_outputs.append({
                        "type": "stream",
                        "text": txt
                    })

            # 4. Error
            elif ot == "error":
                tb = out.get("traceback", [])
                tb_text = "\n".join(tb) if isinstance(tb, list) else str(tb)
                tb_text = clean_ansi(tb_text)
                if not tb_text.strip():
                    tb_text = f"{out.get('ename', 'Error')}: {out.get('evalue', '')}"
                processed_outputs.append({
                    "type": "error",
                    "text": tb_text
                })

        processed_cells.append({
            "cell_type": cell_type,
            "source": source,
            "execution_count": execution_count,
            "outputs": processed_outputs
        })

    practical_item = {
        "filename": filename,
        "cleanName": meta["cleanName"],
        "title": meta["title"],
        "totalCells": len(processed_cells),
        "cells": processed_cells
    }
    practicals.append(practical_item)
    print(f"Processed '{filename}': {len(processed_cells)} cells, {sum(len(c['outputs']) for c in processed_cells)} outputs")

# Write practicals.json
with open(out_json_path, "w", encoding="utf-8") as f:
    json.dump(practicals, f, indent=2, ensure_ascii=False)

# Write practicals_data.js
with open(out_js_path, "w", encoding="utf-8") as f:
    f.write("window.PRACTICALS_DATA = ")
    json.dump(practicals, f, indent=2, ensure_ascii=False)
    f.write(";\n")

print(f"SUCCESS: Saved {len(practicals)} practicals to practicals.json and practicals_data.js")
