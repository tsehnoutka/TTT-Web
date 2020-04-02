jQuery(document).ready(function($) {
  //******************************************************************************
  //                           Socket stuff
  //******************************************************************************
  var socket = io.connect('http://localhost:5000');
  const INPUT = $('#input');
  const STATUS = $('#status');
  const CONTENT = $('#content');
  var code = 0;
  var name = "";
  var color = "";

  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    CONTENT.html($('<p>', {
      text: 'Sorry, but your browser doesn\'t support WebSocket.'
    }));
  }

  //  handle web page envents
  //Create a new game.
  $('#new').on('click', function() {
    console.log(" New game clicked");
    name = $('#nameNew').val();
    color = "red"
    if (!name) {
      alert('Please enter your name.');
      return;
    }
    socket.emit('createGame', {
      name: name
    });
  });
  //Join an existing game
  $('#join').on('click', function() {
    name = $('#nameJoin').val();
    color = "green";
    var roomID = $('#room').val();
    if (!name || !roomID) {
      alert('Please enter your name and game code.');
      return;
    }
    socket.emit('joinGame', {
      name: name,
      room: roomID
    });
  });

  INPUT.keydown(function(e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      socket.emit('message', {
        name: name,
        text: msg,
        color: color,
        room: code
      });
      $(this).val('');
      // disable the INPUT field to make the user wait until server
      // sends back response
      INPUT.attr('disabled', 'disabled');
    }
  });

  function SendTurn(id) {
    socket.emit('turn', {
      name: name,
      id: id,
      room: code
    });
    yourTurn=false;
    console.log("Sent message to server should no longer be your turn: "+ yourTurn);
  }

  function sendPlayAgain(){
    socket.emit('playAgain', {room:code});
  }

  //  responses from server
  //New Game created. Update UI.
  socket.on('newGame', function(data) {
    console.log(" New game returned ");
    var message = 'Please ask your friend to enter Game ID: ' +
      data.room + '. Waiting for player 2...';
    addMessage("SERVER", message, "Black", data.time);
    INPUT.removeAttr('disabled'); //  enable the message box
    STATUS.text('Message: ');
    code = data.room;
    yourTurn=true;
    console.log("Server created game, should  be your turn: "+ yourTurn);

  });

  socket.on('joined', function(data) {
    console.log(" joined returned ");
    addMessage("SERVER", data.text, "Black", data.time);
  });

  socket.on('message', function(data) {
    addMessage(data.name, data.text, data.color, data.time);
    INPUT.removeAttr('disabled'); //  enable the message box
  });

  socket.on('err', function(data) {
    addMessage("SERVER", data.text, "black", data.time)
    //CONTENT.prepend(data.message);
  });
  //Joined the game, so player is player 2
  socket.on('player2', function(data) {
    addMessage(name, " have joined the game.", color, data.time);
    INPUT.removeAttr('disabled'); //  enable the message box
    STATUS.text('Message: ');
    code = data.code;
  });

  socket.on('turn', function(data) {
    console.log("recieved TURN message");
    makeMove(data.id, false);
    //yourTurn=true;
    yourTurn = (yourTurn==false) ? true : false;
    console.log("Server responded from turn, should be your turn: "+ yourTurn);

  });

  socket.on('playAgain', function(data){
    console.log("recieved play again");
    recievedPlayAgain=true;
    onPlayAgain();
  });

  function addMessage(author, message, color, now) {
    var dt = new Date(now);
    CONTENT.prepend('<p><span style="color:' + color + '">' +
      author + '</span> @ ' + (dt.getHours() < 10 ? '0' +
        dt.getHours() : dt.getHours()) + ':' +
      (dt.getMinutes() < 10 ?
        '0' + dt.getMinutes() : dt.getMinutes()) +
      ': ' + message + '</p>');
  } //  end add message

  //****************************************************************************
  //                           Game stuff
  //****************************************************************************
  var playerScore = [
    [],
    []
  ]; //  player, squares
  const PLAYER1_COLOR = "red";
  const PLAYER2_COLOR = "green";
  const PLAYER1 = 0;
  const PLAYER2 = 1;
  var player = PLAYER1;
  var done = false;
  var yourTurn= false;
  var recievedPlayAgain=false;

  //  crete the function to create the event handler for each box of the game
  for (y = 1; y <= 3; y++)
    for (x = 1; x <= 3; x++) {
      var eleID="#"+y+""+x;
      var tempEle=$(eleID);
      $(eleID).on("click", function(event) {
        var y = this.id.substring(0, 1);
        var x = this.id.substring(1);
        var id = y + "" + x;

        makeMove(id, true);
      }); //  end of creating click function
    } //  end of for x
  function makeMove(id, checkWhoseTurn) {


    if (playerScore[PLAYER1].indexOf(id) < 0 &&
        playerScore[PLAYER2].indexOf(id) < 0 && !done) {
      //  the square is open
      //  I don't want to check whose turn it is if this is called from
      //  the server sending me my opponent's turn
      console.log("In Clicked: " + yourTurn);

      if (checkWhoseTurn)
        if(!yourTurn){
        alert ( "NOT your turn !!");
        return;
      }
      var color = (player == PLAYER1) ? PLAYER1_COLOR : PLAYER2_COLOR;
      document.getElementById(id).style.backgroundColor = color;
      playerScore[player].push(id); //  put this square's id in the array
      if (checkWinnerPlayer()) //  check to see if player  won.
        done = true;

      document.getElementById("turnbox").style.backgroundColor =
        (player != PLAYER1) ? PLAYER1_COLOR : PLAYER2_COLOR;
      player = (player ^ PLAYER1) ? PLAYER1 : PLAYER2; //  change player
      if (checkWhoseTurn)
      SendTurn(id);
    }
  }

  const BTN_PLAYAGAIN = document.querySelector("#playagain");
  function onPlayAgain() {
    console.log("Play again button has been pushed");
    // need to blank out the arrays
    for (i = 0; i <= 1; i++)  //  number of players
      while (0 < playerScore[i].length)
        playerScore[i].pop();
    // need to blank out the gaming squares
    for (y = 1; y <= 3; y++)
      for (x = 1; x <= 3; x++) {
        var id=y+""+x;
        document.getElementById(id).style.backgroundColor = '#F1F6F3';
      }
      //yourTurn = (yourTurn==false) ? true : false;
      console.log("Play Again : "+ yourTurn);
      done=false;

      //  need to send a message to the opponenet and all they
      //  should do is call this function
      if(!recievedPlayAgain)
        sendPlayAgain();
      recievedPlayAgain=false;
  }
  BTN_PLAYAGAIN.addEventListener("click", onPlayAgain, false);


  function checkWinnerPlayer() {
    var playerrows = [];
    var playercols = [];

    for (i = 0; i < playerScore[player].length; i++) {
      var rowsColumns = [];
      rowsColumns = playerScore[player][i];
      playerrows.push(rowsColumns[0]);
      playercols.push(rowsColumns[1]);
    }

    var playerWinner = checkForRowColumn(playerrows);
    if (!playerWinner)
      playerWinner = checkForRowColumn(playercols);
    if (!playerWinner)
      playerWinner = checkForDiagonal(playerScore[player]);

    if (playerWinner) {
      var winner = (player == PLAYER1) ? PLAYER1_COLOR : PLAYER2_COLOR
      alert(winner + ' wins!!\n\n click play again to resume');
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
        if (array[i] == "1")
          one++;
        if (array[i] == "2")
          two++;
        if (array[i] == "3")
          three++;
      }
      if (one == 3 || two == 3 || three == 3)
        return true;
    }
    return false;
  }

  function checkForDiagonal(playerScore) {
    if (playerScore.length > 2) {
      if (playerScore.indexOf("11") > -1 && playerScore.indexOf("22") > -1 && playerScore.indexOf("33") > -1)
        return true;
      if (playerScore.indexOf("13") > -1 && playerScore.indexOf("22") > -1 && playerScore.indexOf("31") > -1)
        return true;
    }
    return false;
  }
}); //  end document ready function
