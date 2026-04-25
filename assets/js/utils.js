export function setText(id, value) {
    if (value === undefined || value === null || value === '') {
        return;
    }

    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.textContent = value;
}

export function setInputPlaceholder(id, value) {
    if (!value) {
        return;
    }

    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.setAttribute('placeholder', value);
}

export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function isValidHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function getPath(obj, path) {
    return String(path)
        .split('.')
        .reduce((current, key) => current?.[key], obj);
}

export function isIndexKey(key) {
    return /^\d+$/.test(String(key));
}

export function setPath(obj, path, value) {
    const keys = String(path).split('.');
    const last = keys[keys.length - 1];
    let target = obj;

    for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        const nextKey = keys[i + 1];

        if (Array.isArray(target) && isIndexKey(key)) {
            const idx = Number(key);
            if (target[idx] === undefined || target[idx] === null || typeof target[idx] !== 'object') {
                target[idx] = isIndexKey(nextKey) ? [] : {};
            }
            target = target[idx];
            continue;
        }

        if (target[key] === undefined || target[key] === null || typeof target[key] !== 'object') {
            target[key] = isIndexKey(nextKey) ? [] : {};
        }
        target = target[key];
    }

    if (Array.isArray(target) && isIndexKey(last)) {
        target[Number(last)] = value;
        return;
    }

    target[last] = value;
}

export function removePath(obj, path) {
    const keys = String(path).split('.');
    const stack = [obj];
    let current = obj;

    for (const key of keys) {
        if (!current || typeof current !== 'object' || !(key in current)) {
            return;
        }
        current = current[key];
        stack.push(current);
    }

    const leafParent = stack[stack.length - 2];
    const leafKey = keys[keys.length - 1];
    delete leafParent[leafKey];

    for (let i = keys.length - 1; i > 0; i -= 1) {
        const parent = stack[i - 1];
        const key = keys[i - 1];
        const value = parent[key];

        if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
            delete parent[key];
            continue;
        }
        break;
    }
}

export function revealElements(selector = '.reveal', className = 'visible') {
    document.querySelectorAll(selector).forEach((element) => {
        element.classList.add(className);
    });
}

export function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneDeep(item));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, cloneDeep(nested)])
        );
    }

    return value;
}

export function mergeDeep(base, override) {
    const output = cloneDeep(base);

    if (!override || typeof override !== 'object') {
        return output;
    }

    Object.entries(override).forEach(([key, value]) => {
        const current = output[key];

        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            current &&
            typeof current === 'object' &&
            !Array.isArray(current)
        ) {
            output[key] = mergeDeep(current, value);
            return;
        }

        if (value !== null && value !== undefined) {
            output[key] = value;
        }
    });

    return output;
}