// Copia o link público (comprovante) para compartilhar; devolve true se deu certo
export async function copyLink(path) {
  const url = `${window.location.origin}${path}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    window.prompt('Copie o link do comprovante:', url);
    return false;
  }
}
