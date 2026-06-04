'use client';

// Avatar avec initiales et couleur déterministe à partir du nom
export default function Avatar({ name, size = 36, color = null }) {
    const initials = (name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Hash simple et stable du nom → teinte HSL
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    const bg = color || `hsl(${hue}, 60%, 45%)`;

    return (
        <div
            className="avatar"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.38,
                background: `linear-gradient(135deg, ${bg}, hsl(${(hue + 25) % 360}, 60%, 35%))`,
            }}
            title={name}
        >
            {initials}
        </div>
    );
}
