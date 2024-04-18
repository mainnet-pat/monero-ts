"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0; /**
 * Models the result of initializing a multisig wallet which results in the
 * multisig wallet's address xor another multisig hex to share with
 * participants to create the wallet.
 */
class MoneroMultisigInitResult {




  constructor(result) {
    Object.assign(this, result);
  }

  toJson() {
    return Object.assign({}, this);
  }

  getAddress() {
    return this.address;
  }

  setAddress(address) {
    this.address = address;
    return this;
  }

  getMultisigHex() {
    return this.multisigHex;
  }

  setMultisigHex(multisigHex) {
    this.multisigHex = multisigHex;
    return this;
  }
}exports.default = MoneroMultisigInitResult;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJNb25lcm9NdWx0aXNpZ0luaXRSZXN1bHQiLCJjb25zdHJ1Y3RvciIsInJlc3VsdCIsIk9iamVjdCIsImFzc2lnbiIsInRvSnNvbiIsImdldEFkZHJlc3MiLCJhZGRyZXNzIiwic2V0QWRkcmVzcyIsImdldE11bHRpc2lnSGV4IiwibXVsdGlzaWdIZXgiLCJzZXRNdWx0aXNpZ0hleCIsImV4cG9ydHMiLCJkZWZhdWx0Il0sInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21haW4vdHMvd2FsbGV0L21vZGVsL01vbmVyb011bHRpc2lnSW5pdFJlc3VsdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1vZGVscyB0aGUgcmVzdWx0IG9mIGluaXRpYWxpemluZyBhIG11bHRpc2lnIHdhbGxldCB3aGljaCByZXN1bHRzIGluIHRoZVxuICogbXVsdGlzaWcgd2FsbGV0J3MgYWRkcmVzcyB4b3IgYW5vdGhlciBtdWx0aXNpZyBoZXggdG8gc2hhcmUgd2l0aFxuICogcGFydGljaXBhbnRzIHRvIGNyZWF0ZSB0aGUgd2FsbGV0LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNb25lcm9NdWx0aXNpZ0luaXRSZXN1bHQge1xuXG4gIGFkZHJlc3M6IHN0cmluZztcbiAgbXVsdGlzaWdIZXg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihyZXN1bHQ/OiBQYXJ0aWFsPE1vbmVyb011bHRpc2lnSW5pdFJlc3VsdD4pIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIHJlc3VsdCk7XG4gIH1cbiAgXG4gIHRvSnNvbigpOiBhbnkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCB0aGlzKTtcbiAgfVxuICBcbiAgZ2V0QWRkcmVzcygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmFkZHJlc3M7XG4gIH1cbiAgXG4gIHNldEFkZHJlc3MoYWRkcmVzczogc3RyaW5nKTogTW9uZXJvTXVsdGlzaWdJbml0UmVzdWx0IHtcbiAgICB0aGlzLmFkZHJlc3MgPSBhZGRyZXNzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBnZXRNdWx0aXNpZ0hleCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLm11bHRpc2lnSGV4O1xuICB9XG4gIFxuICBzZXRNdWx0aXNpZ0hleChtdWx0aXNpZ0hleDogc3RyaW5nKTogTW9uZXJvTXVsdGlzaWdJbml0UmVzdWx0IHtcbiAgICB0aGlzLm11bHRpc2lnSGV4ID0gbXVsdGlzaWdIZXg7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6InFHQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDZSxNQUFNQSx3QkFBd0IsQ0FBQzs7Ozs7RUFLNUNDLFdBQVdBLENBQUNDLE1BQTBDLEVBQUU7SUFDdERDLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDLElBQUksRUFBRUYsTUFBTSxDQUFDO0VBQzdCOztFQUVBRyxNQUFNQSxDQUFBLEVBQVE7SUFDWixPQUFPRixNQUFNLENBQUNDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7RUFDaEM7O0VBRUFFLFVBQVVBLENBQUEsRUFBVztJQUNuQixPQUFPLElBQUksQ0FBQ0MsT0FBTztFQUNyQjs7RUFFQUMsVUFBVUEsQ0FBQ0QsT0FBZSxFQUE0QjtJQUNwRCxJQUFJLENBQUNBLE9BQU8sR0FBR0EsT0FBTztJQUN0QixPQUFPLElBQUk7RUFDYjs7RUFFQUUsY0FBY0EsQ0FBQSxFQUFXO0lBQ3ZCLE9BQU8sSUFBSSxDQUFDQyxXQUFXO0VBQ3pCOztFQUVBQyxjQUFjQSxDQUFDRCxXQUFtQixFQUE0QjtJQUM1RCxJQUFJLENBQUNBLFdBQVcsR0FBR0EsV0FBVztJQUM5QixPQUFPLElBQUk7RUFDYjtBQUNGLENBQUNFLE9BQUEsQ0FBQUMsT0FBQSxHQUFBYix3QkFBQSIsImlnbm9yZUxpc3QiOltdfQ==