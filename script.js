// Code goes here
const CREATE_BTN=document.getElementById("create");
const JOIN_BTN=document.getElementById("join");
const GAME_ID_TXT=document.getElementById("gameId");
const CONTENT_TXT=document.getElementById("tim");

//  message types
const MT_CREATE = 0;
const MT_JOIN = 0;
const MT_MOVE = 0;
const MT_MESSAGE = 0;
const MT_PLAY_AGAIN = 0;

function onCreate(){
  console.log("on Create pressed");
}
function onJoin(){
  console.log("on Join pressed");
}

var playerScore = [[],[]];
var player=0;  // 0 for player 1, 1 for palyer 2
var clickCount = 0;

function clicked(id) {
    // player One
    //if clickcount is equally diisable by 2 - then it is player 1  ( else player 2)
    // next we're checdking to see if the square id is already in the player's array.  which would mean the sqaure has been played.
    //  lastly we are checking fithe game has ended
    if(clickCount % 2 == 0)
      player=0;  //player 1
    else
      player=1; // player 2
    if (playerScore[0].indexOf(id) < 0 && playerScore[1].indexOf(id) < 0 && clickCount <= 9) {
      //  the square is open
      var color = (player==0)?"red":"green";
        document.getElementById(id).style.backgroundColor = color;  // paint it red for player one
        playerScore[player].push(id); //  put this square's id in teh array
        clickCount++;  // increment clickcount
        if (checkWinnerPlayer())  //  check to see iff player 1 won.
            clickCount = 10;
    }
    color = (player!=0)?"red":"green";
    document.getElementById("turnbox").style.backgroundColor = color;
}

function Reset() {
    location.reload();
}

function checkWinnerPlayer() {
    var playerrows = [];
    var playercols = [];

    for (i = 0; i < playerScore[player].length; i++) {
        var rowsColumns = [];
        rowsColumns = playerScore[player][i].toString().split('.');
        playerrows.push(rowsColumns[0]);
        playercols.push(rowsColumns[1]);
    }

    var playerWinner = checkForRowColumn(playerrows);
    if (!playerWinner)
        playerWinner = checkForRowColumn(playercols);
    if (!playerWinner)
        playerWinner = checkForDiagonal(playerScore[player]);

    if (playerWinner) {
        //var play1 = document.getElementById("txtPlayer1Name").value;
        var winner = (player==0)?'Red ':'Green '
        alert( winner + 'wins click play again to resume');
        //document.getElementById("divResult").style.display = "block";
        //document.getElementById("divwinner").innerHTML = play1;
        return true;
    }
    return false;
}

function checkForRowColumn(array) {
    if (array.length > 2) {
        var one = 0;
        var two = 0;
        var three = 0;
        for (i = 0; i < array.length; i++) {
            if (array[i] == '1')
                one++;
            if (array[i] == '2')
                two++;
            if (array[i] == '3')
                three++;
    }
    if (one == 3 || two == 3 || three == 3)
        return true;
}
    return false;
}

function checkForDiagonal(playerScore) {
    if (playerScore.length > 2) {
        if (playerScore.indexOf('1.1') > -1 && playerScore.indexOf('2.2') > -1 && playerScore.indexOf('3.3') > -1)
            return true;
        if (playerScore.indexOf('1.3') > -1 && playerScore.indexOf('2.2') > -1 && playerScore.indexOf('3.1') > -1)
            return true;
    }
    return false;
}



// ****************    client    ******************************
$(function () {
  "use strict";
  // for better performance - to avoid searching in DOM
  var content = $('#content');
  var input = $('#input');
  var status = $('#status');
  // my color assigned by the server
  var myColor = false;
  // my name sent to the server
  var myName = false;
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text:'Sorry, but your browser doesn\'t support WebSocket.'}
    ));
    input.hide();
    $('span').hide();
    return;
  }
  // open connection
  var connection = new WebSocket('ws://127.0.0.1:1338');
  connection.onopen = function () {
    // first we want users to enter their names
    input.removeAttr('disabled');
    status.text('Choose name:');
  };
  connection.onerror = function (error) {
    // just in there were some problems with connection...
    content.html($('<p>', {
      text: 'Sorry, but there\'s some problem with your '
         + 'connection or the server is down.'
    }));
  };
  // most important part - incoming messages
  connection.onmessage = function (message) {
    // try to parse JSON message. Because we know that the server
    // always returns JSON this should work without any problem but
    // we should make sure that the massage is not chunked or
    // otherwise damaged.
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid JSON: ', message.data);
      return;
    }
    // NOTE: if you're not sure about the JSON structure
    // check the server source code above
    // first response from the server with user's color
    if (json.type === 'color') {
      myColor = json.data;
      status.text(myName + ': ').css('color', myColor);
      input.removeAttr('disabled').focus();
      // from now user can start sending messages
    } else if (json.type === 'history') { // entire message history
      // insert every single message to the chat window
      for (var i=0; i < json.data.length; i++) {
      addMessage(json.data[i].author, json.data[i].text,
          json.data[i].color, new Date(json.data[i].time));
      }
    } else if (json.type === 'message') { // it's a single message
      // let the user write another message
      input.removeAttr('disabled');
      addMessage(json.data.author, json.data.text,
                 json.data.color, new Date(json.data.time));
    } else {
      console.log('Hmm..., I\'ve never seen JSON like this:', json);
    }
  };
  /**
   * Send message when user presses Enter key
   */
  input.keydown(function(e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      connection.send(msg);
      $(this).val('');
      // disable the input field to make the user wait until server
      // sends back response
      input.attr('disabled', 'disabled');
      // we know that the first message sent from a user their name
      if (myName === false) {
        myName = msg;
      }
    }
  });
  /**
   * This method is optional. If the server wasn't able to
   * respond to the in 3 seconds then show some error message
   * to notify the user that something is wrong.
   */
  setInterval(function() {
    if (connection.readyState !== 1) {
      status.text('Error');
      input.attr('disabled', 'disabled').val(
          'Unable to communicate with the WebSocket server.');
    }
  }, 3000);
  /**
   * Add message to the chat window
   */
  function addMessage(author, message, color, dt) {
    content.prepend('<p><span style="color:' + color + '">'
        + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
        + dt.getHours() : dt.getHours()) + ':'
        + (dt.getMinutes() < 10
          ? '0' + dt.getMinutes() : dt.getMinutes())
        + ': ' + message + '</p>');
  }
});  //  end of function
