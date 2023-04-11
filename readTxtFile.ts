/**
 * Source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#processing_a_text_file_line_by_line
 * @param reader 
 */
export async function* makeTextFileLineIterator(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
    const utf8Decoder = new TextDecoder("utf-8");
    let { value, done: readerDone } = await reader.read();
    let chunk = value ? utf8Decoder.decode(value) : "";
  
    const newline = /\r?\n/gm;
    let startIndex = 0;
    let result;
  
    while (true) {
      const result = newline.exec(chunk);
      if (!result) {
        if (readerDone) break;
        const remainder = chunk.substr(startIndex);
        ({ value, done: readerDone } = await reader.read());
        chunk = remainder + (value ? utf8Decoder.decode(value) : "");
        startIndex = newline.lastIndex = 0;
        continue;
      }
      yield chunk.substring(startIndex, result.index);
      startIndex = newline.lastIndex;
    }
  
    if (startIndex < chunk.length) {
      // Last line didn't end in a newline char
      yield chunk.substr(startIndex);
    }
  };

  const decode = (decoder: TextDecoder, buf?: Uint8Array): string => buf ? decoder.decode(buf) : "";