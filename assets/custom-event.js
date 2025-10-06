class VariantPicker extends HTMLElement {
    constructor() {
      super();
      console.log('variant-picker');
    }

    get sectionId() {
      return this.dataset.sectionId;
    }

    connectedCallback() {
      this.variantSelector = this.querySelectorAll('input[type="radio"]');
      this.handleChange = this.handleChange.bind(this);

      this.variantSelector.forEach((selector) => {
        selector.addEventListener('change', this.handleChange);
      });

      // ✅ Initialize swiper once page + scripts fully load
      window.addEventListener("load", () => {
        this.initSwiper();
      });
    }

    disconnectedCallback() {
      this.variantSelector.forEach((selector) => {
        selector.removeEventListener('change', this.handleChange);
      });
    }

    handleChange(e) {
      const select = e.currentTarget;
      const url = `${window.location.pathname}?variant=${select.value}&section_id=${this.sectionId}`;

      fetch(url)
        .then((response) => response.text())
        .then((html) => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;

          document.querySelector('.custom-product-main').innerHTML =
            tempDiv.querySelector('.custom-product-main').innerHTML;

          // Reinitialize thumbnail click listeners after DOM update
          const gallaryThumbnails = document.querySelector('gallary-thumbnails');
          if (gallaryThumbnails) {
            gallaryThumbnails.connectedCallback();
          }

          const newUrl = new URL(url, window.location.origin);
          newUrl.searchParams.delete('section_id');
          window.history.pushState({}, '', newUrl.toString());
        });
    }

  }

  customElements.define('variant-picker', VariantPicker);


  class VariantPickerModal extends HTMLElement {
    constructor() {
      super();
      this.productData = null;
      this.atcForm = null;
      this.atcInput = null;
    }
  
    connectedCallback() {
      try {
        const productContainer = this.closest('.custom-product-modal__product') || this.parentElement;
        if (!productContainer) {
          console.warn('VariantPickerModal: parent product container not found');
        }
  
        // 1) parse product JSON
        const productScript = productContainer?.querySelector('.product-data-modal');
        if (productScript) {
          try {
            this.productData = JSON.parse(productScript.textContent);
          } catch (err) {
            console.error('VariantPickerModal: could not parse product JSON', err);
          }
        } else {
          console.warn('VariantPickerModal: .product-data-modal script tag not found');
        }
  
        // 2) find the ATC form and its hidden input[name="id"]
        this.atcForm = productContainer?.querySelector('form[action*="/cart/add"]');
        if (this.atcForm) {
          this.atcInput = this.atcForm.querySelector('input[name="id"]');
          if (!this.atcInput) {
            // create one if missing
            this.atcInput = document.createElement('input');
            this.atcInput.type = 'hidden';
            this.atcInput.name = 'id';
            this.atcForm.appendChild(this.atcInput);
          }
        } else {
          console.warn('VariantPickerModal: ATC form not found');
        }
  
        // 3) wire up listeners on radios/selects
        const controls = Array.from(this.querySelectorAll('input[type="radio"], select'));
        controls.forEach(c => c.addEventListener('change', () => this.onOptionChange()));
  
        // 4) set initial selection & update ATC input
        this.onOptionChange();
  
      } catch (err) {
        console.error('VariantPickerModal init error', err);
      }
    }
  
    disconnectedCallback() {
      const controls = Array.from(this.querySelectorAll('input[type="radio"], select'));
      controls.forEach(c => c.removeEventListener('change', () => this.onOptionChange()));
    }
  
    // helper: safe CSS selector escape
    escapeSelector(s) {
      if (window.CSS && CSS.escape) return CSS.escape(s);
      return s.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
    }
  
    onOptionChange() {
      if (!this.productData) {
        // Fallback: if inputs themselves contain variant id values (common), use checked radio's value
        const fallbackChecked = this.querySelector('input[type="radio"]:checked');
        if (fallbackChecked && /^\d+$/.test(fallbackChecked.value)) {
          this.updateAddToCartForm(fallbackChecked.value);
          console.log('VariantPickerModal: fallback used variant id from radio.value', fallbackChecked.value);
        }
        return;
      }
  
      // Build a map of selected values keyed by product option name
      const selectedByName = {};
      this.productData.options.forEach((optionName) => {
        // find select for this option
        const sel = this.querySelector(`select[name="${this.escapeSelector(optionName)}"]`);
        if (sel) {
          const opt = sel.options[sel.selectedIndex];
          selectedByName[optionName] = (opt && opt.text) ? opt.text.trim() : sel.value;
          return;
        }
  
        // find checked radio for this option
        const radios = Array.from(this.querySelectorAll(`input[name="${this.escapeSelector(optionName)}"]`));
        if (radios.length) {
          const checked = radios.find(r => r.checked);
          if (checked) {
            // attempt to read the visible label text (works whether label wraps input or uses for="")
            let labelEl = this.querySelector(`label[for="${this.escapeSelector(checked.id)}"]`) || checked.closest('label');
            let text = checked.value;
            if (labelEl) {
              // remove the input's own text by cloning and removing child input if present
              text = labelEl.textContent.trim();
            }
            selectedByName[optionName] = text;
            return;
          }
        }
  
        // if nothing selected yet, leave blank
        selectedByName[optionName] = '';
      });
  
      // produce ordered array of values that matches variant.options order
      const selectedValuesArray = this.productData.options.map(name => (selectedByName[name] || '').trim());
  
      console.log('VariantPickerModal selected values ->', selectedValuesArray);
  
      // find variant whose options match selectedValuesArray
      const matchedVariant = this.productData.variants.find(variant => {
        // variant.options is an array with same ordering as productData.options
        return variant.options.every((vOpt, idx) => {
          const sel = (selectedValuesArray[idx] || '').toString().trim().toLowerCase();
          return (vOpt || '').toString().trim().toLowerCase() === sel;
        });
      });
  
      if (matchedVariant) {
        console.log('VariantPickerModal: matched variant', matchedVariant.id);
        this.updateAddToCartForm(matchedVariant.id, !!matchedVariant.available);
        return;
      }
  
      // If no variant matched, fallback: maybe inputs store variant id as value
      const anyChecked = this.querySelector('input[type="radio"]:checked');
      if (anyChecked && /^\d+$/.test(anyChecked.value)) {
        console.log('VariantPickerModal: fallback matched variant id from input value', anyChecked.value);
        this.updateAddToCartForm(anyChecked.value);
        return;
      }
  
      console.warn('VariantPickerModal: no matching variant found for', selectedValuesArray);
    }
  
    updateAddToCartForm(variantId, available = true) {
      if (!variantId) return;
      if (!this.atcInput) {
        console.warn('VariantPickerModal: no ATC input to update');
        return;
      }
  
      // Write value and trigger change
      if (this.atcInput.value !== String(variantId)) {
        this.atcInput.value = String(variantId);
        this.atcInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('VariantPickerModal: ATC input updated to', variantId);
      }
  
      // optionally update submit button state if available
      if (this.atcForm) {
        const submit = this.atcForm.querySelector('[type="submit"], button:not([type])');
        if (submit) {
          submit.disabled = !available;
        }
      }
    }
  }
  
  customElements.define('variant-picker-modal', VariantPickerModal);
  

  class GallaryThumbnails extends HTMLElement {
      constructor(){
         super();
      }

      connectedCallback() {
        this.thumbnailImages = this.querySelectorAll('.custom-slide img');
        this.mainImage = document.querySelector('.custom-product-images_main_img');
        
        this.handleThumbnailClick = this.handleThumbnailClick.bind(this);
        
        this.thumbnailImages.forEach((thumbnail) => {
          thumbnail.addEventListener('click', this.handleThumbnailClick);
        });
        
        // Set initial active state
        this.setInitialActiveState();
      }

      disconnectedCallback() {
        this.thumbnailImages.forEach((thumbnail) => {
          thumbnail.removeEventListener('click', this.handleThumbnailClick);
        });
      }

      handleThumbnailClick(e) {
        const clickedImage = e.currentTarget;
        const newImageSrc = clickedImage.src;
        
        // Remove active class from all thumbnails
        this.removeActiveClass();
        
        // Add active class to clicked thumbnail
        const thumbnailItem = clickedImage.closest('.custom-thumbnail-item');
        if (thumbnailItem) {
          thumbnailItem.classList.add('active');
        }
        
        // Update the main image src
        if (this.mainImage) {
          this.mainImage.src = newImageSrc;
          
          // Also update srcset for responsive images
          const srcset = clickedImage.srcset || '';
          if (srcset) {
            this.mainImage.srcset = srcset;
          }
        }
      }

      setInitialActiveState() {
        // Set first thumbnail as active by default
        const firstThumbnail = this.querySelector('.custom-thumbnail-item');
        if (firstThumbnail) {
          firstThumbnail.classList.add('active');
        }
      }

      removeActiveClass() {
        const activeThumbnails = this.querySelectorAll('.custom-thumbnail-item.active');
        activeThumbnails.forEach(thumbnail => {
          thumbnail.classList.remove('active');
        });
      }
  }
  customElements.define('gallary-thumbnails', GallaryThumbnails);


  class ProductModal extends HTMLElement {
    constructor() {
      super();
      this.modal = null;
      this.modalBody = null;
      this.overlay = null;
      this.closeBtn = null;
    }
    connectedCallback() {
      this.modal = this.querySelector('#custom-product-modal');
      this.modalBody = this.querySelector('#custom-product-modal-body');
      this.overlay = this.modal.querySelector('.custom-product-modal__overlay');
      this.closeBtn = this.modal.querySelector('.custom-product-modal__close');

      this.overlay.addEventListener('click', () => this.close());
      this.closeBtn.addEventListener('click', () => this.close());

      // ✅ Use global event delegation
      document.addEventListener('click', (e) => {
        const button = e.target.closest('.custom-product-grid__product-modal-button');
        if (!button) return;

        const productEl = button.closest('.custom-product-grid__product');
        const productId = productEl.dataset.productId;
        const template = document.getElementById(`product-template-${productId}`);
        if (template) this.open(template.innerHTML);
      });
    }

    open(contentHTML) {
      this.modalBody.innerHTML = contentHTML;
      this.modal.classList.add('active');
      this.modal.removeAttribute('hidden');
    }

    close() {
      this.modal.classList.remove('active');
      setTimeout(() => {
        this.modal.setAttribute('hidden', '');
        this.modalBody.innerHTML = '';
      }, 200);
    }
  }

  customElements.define('product-modal', ProductModal);
