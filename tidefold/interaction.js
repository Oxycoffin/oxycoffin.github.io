(() => {
  'use strict';
  const N = 3;
  const decode = async (encoded) => {
    if (!('DecompressionStream' in window)) throw new Error('DecompressionStream unavailable');
    const binary = atob(encoded.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  };
  Promise.all(Array.from({ length: N }, (_, index) => fetch(`interaction.${String(index).padStart(2, '0')}.b64`, { cache: 'no-cache' }).then((response) => {
    if (!response.ok) throw new Error(`interaction ${index}: ${response.status}`);
    return response.text();
  })))
    .then((parts) => decode(parts.join('')))
    .then((source) => (0, eval)(`${source}\n//# sourceURL=tidefold/interaction-runtime.js`))
    .catch((error) => console.error('TIDEFOLD interaction enhancement failed', error));
})();
