export function debeFinalizarArrastre(
  marco: HTMLElement,
  destino: EventTarget | null,
): boolean {
  return !(destino instanceof Node && marco.contains(destino))
}