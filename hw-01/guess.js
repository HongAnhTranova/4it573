var number = Math.floor(Math.random() * 11);
var attempts = 5;

for (var i = 0; i < attempts; i++) {
  var guess = Number(prompt("Hadej cislo mezi 0 a 10:"));

  if (guess === number) {
    alert("Spravne! Cislo bylo " + number);
    break;
  }

  if (i === attempts - 1) {
    alert("Prohrals! Spravne cislo bylo " + number);
    break;
  }

  if (guess > number) {
    alert("Moc vysoko, zkus znovu. Zbyva ti " + (attempts - i - 1) + " pokusu.");
  } else {
    alert("Moc nizko, zkus znovu. Zbyva ti " + (attempts - i - 1) + " pokusu.");
  }
}
