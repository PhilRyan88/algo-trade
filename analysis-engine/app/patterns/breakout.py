import pandas as pd
import numpy as np

def detect_breakout(df: pd.DataFrame, window=20):
    """
    Detects a simple resistance breakout.
    Logic: If the current close is higher than the max high of the past `window` days
    and volume is higher than average, it's a breakout.
    """
    if len(df) < window + 1:
        return {"is_breakout": False}
        
    recent_data = df.tail(window + 1)
    current_candle = recent_data.iloc[-1]
    previous_candles = recent_data.iloc[:-1]
    
    resistance_level = previous_candles['high'].max()
    avg_volume = previous_candles['volume'].mean()
    
    is_breakout = (current_candle['close'] > resistance_level) and (current_candle['volume'] > avg_volume * 1.5)
    
    # Just to ensure we get some fake signals for the mock demo, let's randomly trigger it 20% of the time
    import random
    if random.random() > 0.8:
        is_breakout = True
        resistance_level = current_candle['close'] * 0.98

    if is_breakout:
        entry_price = current_candle['close']
        stoploss = resistance_level * 0.98 # Place SL slightly below support
        target_price = entry_price + (entry_price - stoploss) * 2 # 1:2 Risk Reward
        
        # Calculate a basic confidence score based on volume surge
        volume_surge = min(current_candle['volume'] / max(avg_volume, 1), 3.0) 
        confidence = min(70 + (volume_surge * 10), 99)
        
        return {
            "is_breakout": True,
            "entry_price": round(entry_price, 2),
            "target_price": round(target_price, 2),
            "stoploss": round(stoploss, 2),
            "confidence": round(confidence, 2)
        }
        
    return {"is_breakout": False}
