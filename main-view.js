export const stripeReaderView = (function () {
  /**
   * Creates an HTML element that holds a reader available for use.
   *
   * @param {string} readerName
   * @returns HTMLElement
   */
  function createAvailableReaderElement(reader) {
    const readerWrapper = document.createElement("div");
    const readerLabel = document.createElement("label");
    const connectButton = createConnectButton(reader.id);

    readerWrapper.setAttribute("class", "vertical-wrapper");
    readerLabel.textContent = reader.label;

    readerWrapper.appendChild(readerLabel);
    readerWrapper.appendChild(connectButton);
    return readerWrapper;
  }

  /**
   * Creates HTML disconnect button with event listener to disconnect the already
   *     connected reader when selected.
   *
   * @param {string} readerName Represents the name to be given for the reader
   * @returns {HTMLElement}
   */
  function createDisconnectButton(readerId) {
    const disconnectButton = document.createElement("input");
    disconnectButton.setAttribute("id", readerId);
    disconnectButton.setAttribute("value", "Disconnect");
    disconnectButton.setAttribute("class", "button");
    disconnectButton.setAttribute("type", "button");
    return disconnectButton;
  }

  /**
   * Creates HTML connect button with event listener to connect to the wanted
   *     reader when selected.
   *
   * @param {string} readerName Represents the name to be given for the reader
   * @returns {HTMLElement}
   */
  function createConnectButton(readerId) {
    const connectButton = document.createElement("input");
    connectButton.setAttribute("id", readerId);
    connectButton.setAttribute("value", "Connect");
    connectButton.setAttribute("class", "connect-button button");
    connectButton.setAttribute("type", "button");
    return connectButton;
  }

  /**
   * Creates the HTMLElement that represents the view that will take a new API
   *     secret key to use with connecting to stripe's terminal.
   *
   * @returns {HTMLElement}
   */
  function createSecretKeySetterCard() {
    const wrapper = document.createElement("section");
    wrapper.setAttribute("class", "card-form");
    wrapper.setAttribute("id", "secretKeyCard");
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<label class="subtitle" for="secretKey">Set API secret key</label>
    <input type="text" name="secretKey" id="secretKeyInput"
    placeholder="Setting a new key will overwrite the already used one.">
    <input type="button" class="button" id="secretKeyButton"
     value="Set key">`
    );
    return wrapper;
  }

  return {
    createAvailableReaderElement,
    createDisconnectButton,
    createConnectButton,
    createSecretKeySetterCard,
  };
})();
