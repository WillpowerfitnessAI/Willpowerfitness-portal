import os


def clean_backticks_from_py_files(root_dir="."):
    print("🧹 Scanning for rogue backticks in Python files...\n")
    changed_files = []

    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(subdir, file)

                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                if "`" in content:
                    cleaned = content.replace("`", "")
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(cleaned)
                    changed_files.append(file_path)
                    print(f"✅ Cleaned backticks from: {file_path}")

    if not changed_files:
        print("🎯 No backticks found. Codebase is clean.")
    else:
        print(
            f"\n🚀 Cleaned {len(changed_files)} file(s). You’re good to redeploy."
        )


# Run the cleaner
if __name__ == "__main__":
    clean_backticks_from_py_files()
