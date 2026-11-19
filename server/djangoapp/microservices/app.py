from pathlib import Path
from flask import Flask, jsonify
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# The repository includes the lexicon; startup needs no external download.
nltk.data.path.insert(0, str(Path(__file__).parent))
sia = SentimentIntensityAnalyzer(lexicon_file='sentiment/vader_lexicon.zip/vader_lexicon/vader_lexicon.txt')
app = Flask('Sentiment Analyzer')


@app.get('/')
def home():
    return 'Welcome to the Sentiment Analyzer. Use /analyze/text'


@app.get('/analyze/<path:input_txt>')
def analyze_sentiment(input_txt):
    score = sia.polarity_scores(input_txt)['compound']
    sentiment = 'positive' if score >= 0.05 else 'negative' if score <= -0.05 else 'neutral'
    return jsonify(sentiment=sentiment)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050)
