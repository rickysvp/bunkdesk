import re

with open('/Users/ricky/AICode/hostelite/src/i18nContext.tsx', 'r') as f:
    content = f.read()

# Find and remove the old en block
old_en_start = content.find('    landing: {\n      heroBadge: "BUILT FOR HOSTELS THAT FILL EMPTY BEDS"')
if old_en_start != -1:
    i = old_en_start
    depth = 0
    started = False
    while i < len(content):
        if content[i:i+14] == '    landing: {' and not started:
            started = True
            depth = 1
            i += 14
            continue
        if started:
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    i += 1
                    break
        i += 1
    # Skip trailing whitespace/newlines
    while i < len(content) and content[i] in ' \t':
        i += 1
    if i < len(content) and content[i] == '\n':
        i += 1
    print(f"Removing old en block: [{old_en_start}, {i})")
    content = content[:old_en_start] + content[i:]
else:
    print("Old en block not found")

# Find and remove the old zh block
old_zh_start = content.find('    landing: {\n      heroBadge: "为想填满空床的青旅打造"')
if old_zh_start != -1:
    i = old_zh_start
    depth = 0
    started = False
    while i < len(content):
        if content[i:i+14] == '    landing: {' and not started:
            started = True
            depth = 1
            i += 14
            continue
        if started:
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    i += 1
                    break
        i += 1
    while i < len(content) and content[i] in ' \t':
        i += 1
    if i < len(content) and content[i] == '\n':
        i += 1
    print(f"Removing old zh block: [{old_zh_start}, {i})")
    content = content[:old_zh_start] + content[i:]
else:
    print("Old zh block not found")

with open('/Users/ricky/AICode/hostelite/src/i18nContext.tsx', 'w') as f:
    f.write(content)

print("Done.")
