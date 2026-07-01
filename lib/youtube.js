// Extrait l'ID vidéo (11 caractères) d'une URL YouTube, ou null.
export function youtubeId(url) {
    if (!url) return null;
    const m = String(url).match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[2].length === 11 ? m[2] : null;
}
