/**
 * @fileoverview Includes what readers are available, and which one is connnected.
 */
export const ReadersModel = (function () {
  let readersList_ = undefined;
  let readerConnected_ = undefined;

  function getReadersList() {
    return readersList_;
  }
  function setReadersList(newListReaders) {
    readersList_ = newListReaders;
  }

  function getReaderConnected() {
    return readerConnected_;
  }

  function setReaderConnected(newConnectedReader) {
    readerConnected_ = newConnectedReader;
  }

  return {
    getReadersList,
    setReadersList,
    getReaderConnected,
    setReaderConnected,
  };
})();
