var connectionId = -1;

/* Interprets an ArrayBuffer as UTF-8 encoded string data. */
var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var encodedString = String.fromCharCode.apply(null, bufView);
  return decodeURIComponent(escape(encodedString));
};

/* Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. */
var str2ab = function(str) {
  var encodedString = unescape(encodeURIComponent(str));
  var bytes = new Uint8Array(encodedString.length);
  for (var i = 0; i < encodedString.length; ++i) {
    bytes[i] = encodedString.charCodeAt(i);
  }
  return bytes.buffer;
};

function setPosition(position) {
  console.log('Position: ' + position);
  chrome.serial.send(connectionId, str2ab(position), function() {});
};

function onReceive(receiveInfo) {
  if (receiveInfo.connectionId !== connectionId)
    return;

  var value = ab2str(receiveInfo.data);

  var commands = value.split("\r\n");
  commands.forEach(process)
};

function process(item) {  
  if (!item || item.length < 2)
    return;

  let data = item.substring(0, item.length - 1);
  let command = item.substring(item.length - 1, item.length);

  switch (command) {
    case "a": // Light on and off
      console.log("CMD[a]: " + data);
      let opacity = isNaN(parseInt(data)) ? 0 : parseInt(data);
      document.getElementById('image').style.opacity = (opacity * 0.7) + 0.3;
    break;
    case "b": // Return blink length value
      console.log("CMD[b]: " + data);
    break;
    case "c": // Blink Count
      console.log("CMD[c]: " + data);
      document.getElementById('blinkCount').innerText = data;
    break;    
  }
};

function onError(errorInfo) {
  console.warn("Receive error on serial connection: " + errorInfo.error);
};

chrome.serial.onReceive.addListener(onReceive);
chrome.serial.onReceiveError.addListener(onError);

function onOpen(openInfo) {
  if (!openInfo) {
    setStatus('Could not open');
    return;
  }
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    return;
  }
  setStatus('Connected');

  setPosition(0);
};

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function buildPortPicker(ports) {
  ports.forEach(function(port) {
    console.log(port.path);
  });

  var eligiblePorts = ports.filter(function(port) {
    return !port.path.match(/[Bb]luetooth/);
  });
  
  var portPicker = document.getElementById('port-picker');
  eligiblePorts.forEach(function(port) {
    var portOption = document.createElement('option');
    portOption.value = portOption.innerText = port.path;
    portPicker.appendChild(portOption);
  });

  portPicker.onchange = function() {
    if (connectionId != -1) {
      chrome.serial.disconnect(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  };
}

function openSelectedPort() {
  var portPicker = document.getElementById('port-picker');
  var selectedPort = portPicker.options[portPicker.selectedIndex].value;
  console.log('selectedPort: ' + selectedPort);
  chrome.serial.connect(selectedPort, onOpen);
}

onload = function() {

  document.getElementById('position-input').onchange = function() {
    setPosition(parseInt(this.value, 10));
  };

  chrome.serial.getDevices(function(ports) {
    console.log('Ports: ' + ports);
    buildPortPicker(ports)
    openSelectedPort();
  });
};

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    console.log('Sender: ' + sender.url);
    if (request.position || request.position === 0) {
      document.getElementById('position-input').value = request.position;
      setPosition(request.position);
    }

});