

const menuButton = document.getElementById("menuButton");
const header = document.querySelector(".header");

menuButton.addEventListener("click", () => {
    header.classList.toggle("menu-open");
});

document.querySelector(".back-to-top").addEventListener("click", (e) => {
    e.preventDefault();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
