import {
  calculateSwapOutput,
  calculateMinOutput,
  calculatePriceImpact,
  calculateRequiredInput,
} from '../swapCalculator';

describe('Swap Calculator', () => {
  describe('calculateSwapOutput', () => {
    it('should calculate correct output for a simple swap', () => {
      const amountIn = 1000000; // 1 ALEO in microcredits
      const ra = 1000000000;    // 1 ALEO reserve
      const rb = 1000000;       // 1 USDC reserve

      const output = calculateSwapOutput(amountIn, ra, rb);
      
      // Expected: (1000000 * 997 * 1000000) / (1000000000 * 1000 + 1000000 * 997)
      // = 997000000000 / (1000000000000 + 997000000)
      // = 997000000000 / 1000997000000
      // ≈ 0.995 USDC (with 0.3% fee)
      expect(output).toBeGreaterThan(990000); // Should be around 995000
      expect(output).toBeLessThan(1000000);   // Should be less than 1 USDC due to fee
    });

    it('should throw error for zero reserves', () => {
      expect(() => calculateSwapOutput(1000000, 0, 1000000)).toThrow('Reserves must be greater than 0');
      expect(() => calculateSwapOutput(1000000, 1000000, 0)).toThrow('Reserves must be greater than 0');
    });

    it('should handle large amounts correctly', () => {
      const amountIn = 1000000000; // 1000 ALEO
      const ra = 1000000000000;    // 1000 ALEO reserve
      const rb = 1000000000;       // 1000 USDC reserve

      const output = calculateSwapOutput(amountIn, ra, rb);
      expect(output).toBeGreaterThan(0);
      expect(output).toBeLessThan(rb); // Output should be less than total reserve
    });
  });

  describe('calculateMinOutput', () => {
    it('should calculate minimum output with slippage', () => {
      const expectedOutput = 1000000; // 1 USDC
      const slippage = 0.5; // 0.5%

      const minOut = calculateMinOutput(expectedOutput, slippage);
      const expected = Math.floor(1000000 * 0.995); // 100% - 0.5% = 99.5%
      
      expect(minOut).toBe(expected);
    });

    it('should handle different slippage values', () => {
      const expectedOutput = 1000000;
      
      expect(calculateMinOutput(expectedOutput, 1.0)).toBe(Math.floor(expectedOutput * 0.99));
      expect(calculateMinOutput(expectedOutput, 5.0)).toBe(Math.floor(expectedOutput * 0.95));
      expect(calculateMinOutput(expectedOutput, 0.1)).toBe(Math.floor(expectedOutput * 0.999));
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const amountIn = 1000000; // 1 ALEO
      const ra = 1000000000;    // 1 ALEO reserve

      const impact = calculatePriceImpact(amountIn, ra);
      expect(impact).toBe(0.1); // 1M / 1B = 0.1%
    });

    it('should return 0 for zero amount', () => {
      const impact = calculatePriceImpact(0, 1000000000);
      expect(impact).toBe(0);
    });

    it('should handle large amounts', () => {
      const amountIn = 500000000; // 500 ALEO
      const ra = 1000000000;      // 1000 ALEO reserve

      const impact = calculatePriceImpact(amountIn, ra);
      expect(impact).toBe(50); // 500M / 1B = 50%
    });
  });

  describe('calculateRequiredInput', () => {
    it('should calculate required input for desired output', () => {
      const desiredOutput = 1000000; // 1 USDC
      const ra = 1000000000;         // 1 ALEO reserve
      const rb = 1000000;            // 1 USDC reserve

      const requiredInput = calculateRequiredInput(desiredOutput, ra, rb);
      expect(requiredInput).toBeGreaterThan(0);
    });

    it('should throw error when desired output exceeds reserves', () => {
      const desiredOutput = 2000000; // 2 USDC
      const ra = 1000000000;         // 1 ALEO reserve
      const rb = 1000000;            // 1 USDC reserve

      expect(() => calculateRequiredInput(desiredOutput, ra, rb))
        .toThrow('Desired output exceeds available reserves');
    });

    it('should throw error for zero reserves', () => {
      expect(() => calculateRequiredInput(1000000, 0, 1000000))
        .toThrow('Reserves must be greater than 0');
      expect(() => calculateRequiredInput(1000000, 1000000, 0))
        .toThrow('Reserves must be greater than 0');
    });
  });
});
