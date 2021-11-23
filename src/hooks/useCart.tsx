import { createContext, ReactNode, SetStateAction, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function verifyAmount(productCartAmount: number, productStockAmount: number) {
    if (productCartAmount > productStockAmount) {
      toast.error('Quantidade solicitada fora de estoque');
      throw 'Erro na adição do produto';
    }
  }

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get('/products/' + productId).then(response => response.data);
      const productStock = await api.get('/stock/' + productId).then(response => response.data);

      const productInCartId = cart.findIndex((product) => {
        return product.id === productId;
      })

      // If productInCartNewAmount is equal to 1 then it is a new product
      const productInCartNewAmount = (productInCartId !== -1) ? cart[productInCartId].amount + 1 : 1;
      verifyAmount(productInCartNewAmount, productStock.amount);

      let updatedCart: Product[];
      updatedCart = [];
      
      if (productInCartNewAmount === 1) {
        const updatedProduct = {...product, amount: productInCartNewAmount};
        updatedCart = [...cart, updatedProduct];
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProduct));
      } else {
        updatedCart = [...cart];
        updatedCart[productInCartId].amount = productInCartNewAmount;
        setCart(updatedCart);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCartId = cart.findIndex(product => product.id === productId)      
      
      if (productInCartId !== -1) {
        let updatedCart = [...cart];
        updatedCart = updatedCart.filter(product => product.id !== productId);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else { throw Error(); }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) { return }

      const productAmount = await api.get('/stock/' + productId).then(response => response.data);
      const productInCartId = cart.findIndex((product) => {
        return product.id === productId;
      })

      verifyAmount(amount, productAmount.amount);
      
      const updatedCart = [...cart];
      updatedCart[productInCartId].amount = amount;
      setCart([...updatedCart]);
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
