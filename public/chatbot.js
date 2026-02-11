(function () {
  const button = document.createElement("button");
  button.innerText = "Book Meeting";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.padding = "12px 20px";
  button.style.background = "#000";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.borderRadius = "30px";
  button.style.cursor = "pointer";
  button.style.zIndex = "9999";

  document.body.appendChild(button);

  button.onclick = async () => {
    const email = prompt("Enter your email:");
    if (!email) return;

    const response = await fetch(
      "https://meet-chat-bot.onrender.com/available-slots",
    );
    const slots = await response.json();

    const chosen = prompt(
      "Select slot:\n" + slots.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    );

    const selectedTime = slots[chosen - 1];

    await fetch("https://meet-chat-bot.onrender.com/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, dateTime: selectedTime }),
    });

    alert("Meeting scheduled! Check your email.");
  };
})();
