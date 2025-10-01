
class CustomCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.drawer = this;
  }

  connectedCallback() {
    this.openTriggerId = this.dataset.openTrigger;
    this.openTrigger = document.getElementById(this.openTriggerId);
    this.closeBtn = this.querySelector("[data-close]");
    this.innerContent = this.querySelector(".custom-cart-drawer-inner");
    document.addEventListener("cart:refresh", this.cartRefresh.bind(this));

    // Open drawer
    if (this.openTrigger) {
      this.openTrigger.addEventListener("click", () => this.open());
    }

    // Close drawer button
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    // Close on overlay click (outside inner content)
    this.addEventListener("click", (e) => {
      if (!this.innerContent.contains(e.target)) {
        this.close();
      }
    });
  }

  open() {
    this.classList.add("is-active");
    document.body.classList.add("drawer-open");
  }

  close() {
    this.classList.remove("is-active");
    document.body.classList.remove("drawer-open");
  }
  cartRefresh(e) {
     const fakeElement = document.createElement("div");
     const newHtml = e.detail.sections['custom-cart-drawer'];
     fakeElement.innerHTML = newHtml;
     this.querySelector(".custom-cart-drawer-body").innerHTML = fakeElement.querySelector(".custom-cart-drawer-body").innerHTML;
    console.log(newHtml);
    this.open();
  }
}

customElements.define("custom-cart-drawer", CustomCartDrawer);


class AtcButton extends HTMLElement {
  constructor() {
    super();
    this.submitForm = this.querySelector("form[action*='/cart/add']");
  }
  connectedCallback() {
    this.submitForm.addEventListener("submit", this.onSubmitHandler.bind(this));
  }
  onSubmitHandler(e) {
    e.preventDefault();
    console.log("submit");
    let formData = {
        'items': [{
         'id': this.submitForm.querySelector("input[name='id']").value,
         'quantity': this.submitForm.querySelector("input[name='quantity']").value
         }],
         'sections':'custom-cart-drawer'
       };
       
       fetch(window.Shopify.routes.root + 'cart/add.js', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(formData)
       })
       .then(response => {
         return response.json();
       })
       .then(data => {
        console.log(data);
          document.documentElement.dispatchEvent(
            new CustomEvent('cart:refresh', {
              detail: data,
              bubbles: true,
            })
          )
       })
       .catch((error) => {
         console.error('Error:', error);
       });
  }
}
customElements.define("atc-button", AtcButton);


class CartActions extends HTMLElement{
    constructor(){
        super();
        this.minusButton = this.querySelector("[data-minus]");
        this.plusButton = this.querySelector("[data-plus]");
        this.removeButton = this.querySelector("[data-remove]");
    }
    connectedCallback(){

      this.plusButton?.addEventListener('click', this.handleChange.bind(this));
      this.minusButton?.addEventListener('click', this.handleChange.bind(this));
      this.removeButton?.addEventListener('click', this.handleChange.bind(this));
    }
    handleChange(e){
       console.log("clicked working")
       const formData = {
        'line': parseInt(this.dataset.line, 10),
        'quantity': parseInt(e.currentTarget.dataset.quantity, 10),
        'sections':'custom-cart-drawer'
       }
       fetch(window.Shopify.routes.root + 'cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
       })
       .then(response => {
        return response.json();
       })
       .then(data => {
        document.documentElement.dispatchEvent(
          new CustomEvent('cart:refresh', {
            detail: data,
            bubbles: true,
          })
        )
       })
       .catch((error) => {
        console.error('Error:', error);
       });
    }
}
customElements.define('cart-actions',CartActions)

