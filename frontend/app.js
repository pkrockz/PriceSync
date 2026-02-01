// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCxofKfmOSQgaEQWeG9Ky-Jiy-DHyJoZ4c",
  authDomain: "pricesync-eecb8.firebaseapp.com",
  databaseURL: "https://pricesync-eecb8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pricesync-eecb8",
  storageBucket: "pricesync-eecb8.appspot.com",
  messagingSenderId: "782965273724",
  appId: "1:782965273724:web:74c58858137252d59905f9"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();
const API = "http://localhost:5000";

// AUTH

function register() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(emailVal, passwordVal)
    .then(() => {
      alert("Registered successfully");
      clearAuthInputs();
    })
    .catch(err => alert(err.message));
}

function login() {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(emailVal, passwordVal)
    .then(() => {
      alert("Login successful");
      clearAuthInputs();
    })
    .catch(err => alert(err.message));
}

function isAdmin(user) {
  return user.email === "admin@pricesync.com";
}

function logout() {
  auth.signOut();
}

function clearAuthInputs() {
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
}

// PRODUCTS 

async function addProduct() {
  const name = document.getElementById("pname").value;
  const category = document.getElementById("pcat").value;
  const price = Number(document.getElementById("pprice").value);
  const stock = Number(document.getElementById("pstock").value);

  if (!name || !price || !stock) {
  alert("Fill all fields");
  return; }

  const res = await fetch(`${API}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, price, stock })});

  if (!res.ok) {
    alert("Failed to add product");
    return; }

  document.getElementById("pname").value = "";
  document.getElementById("pcat").value = "";
  document.getElementById("pprice").value = "";
  document.getElementById("pstock").value = "";

  loadProducts(); // refresh list
}

async function updateProduct(id) {
  const price = Number(document.getElementById(`newPrice-${id}`).value);
  const stock = Number(document.getElementById(`newStock-${id}`).value);
  
  if (price < 0 || stock < 0) {
  alert("Invalid values");
  return;}

  const res = await fetch(`${API}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price, stock })
  });

  if (!res.ok) {
    alert("Update failed");
    return;
  }

  loadProducts();
}

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error("Backend not reachable");

    const products = await res.json();
    console.log("Products:", products);

    const div = document.getElementById("products");
    div.innerHTML = "";

    products.forEach(p => {
      div.innerHTML += `
        <div id="p-${p._id}">
          <b>${p.name}</b><br>
          Price: Rs.<span class="price">${p.price}</span><br>
          Stock: <span class="stock">${p.stock}</span><br>
          ${ !isAdmin(auth.currentUser)
            ? `<input type="number" min="1" value="1" id="qty-${p._id}" />
              <button onclick="placeOrder('${p._id}')">Place Order</button>`
            : ""}
            
          ${ isAdmin(auth.currentUser)
              ? `<input type="number" id="newPrice-${p._id}" value="${p.price}" />
                 <input type="number" id="newStock-${p._id}" value="${p.stock}" />
                 <button onclick="updateProduct('${p._id}')">Update</button>
                 <button onclick="deleteProduct('${p._id}')">Delete</button>`: ""}
          <hr>
        </div>
      `;
    });
    attachRealtimeListeners();
  } catch (err) {
    console.error("Load products failed:", err);
    alert("Backend not reachable. Is server running?");
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete product?")) return;
  await fetch(`${API}/products/${id}`, {
    method: "DELETE"
  });
  loadProducts();
}

// ORDERS

async function placeOrder(productId) {
  const qty = Number(document.getElementById(`qty-${productId}`).value);
  const price = Number(
    document.querySelector(`#p-${productId} .price`).innerText
  );

  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: auth.currentUser.uid,
      items: [
        {
          productId,
          quantity: qty,
          price
        }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) alert(data.error || "Order failed");
}

let listenersAttached = false;

function attachRealtimeListeners() {
  if (listenersAttached) return; // prevent duplicate listeners
  listenersAttached = true;

  db.ref("stock").on("value", snap => {
    const data = snap.val();
    if (!data) return;

    for (let id in data) {
      const el = document.querySelector(`#p-${id} .stock`);
      if (el) el.innerText = data[id];
    }
  });

  db.ref("price").on("value", snap => {
    const data = snap.val();
    if (!data) return;

    for (let id in data) {
      const el = document.querySelector(`#p-${id} .price`);
      if (el) el.innerText = data[id];
    }
  });
}

auth.onAuthStateChanged(user => {
  const header = document.getElementById("auth-header");
  const adminPanel = document.getElementById("admin-panel");

  if (user) {
    header.style.display = "none";
    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";

    if (adminPanel) {
      adminPanel.style.display = isAdmin(user) ? "block" : "none";
    }

    loadProducts();
  } else {
    header.style.display = "block";
    document.getElementById("auth").style.display = "block";
    document.getElementById("app").style.display = "none";

    if (adminPanel) adminPanel.style.display = "none";
    listenersAttached = false;
  }
});
