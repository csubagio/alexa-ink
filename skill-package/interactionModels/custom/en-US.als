// This model defined in Alexa Language Shorthand, https://csubagio.github.io/alexa-language-shorthand

INVOCATION Ink Story

SLOTTYPE Option
  this is a dummy option that will be replaced

INTENT SelectOption
  (I'll|we'll|let's|I will|we will) (go with|do) {option}
  (I|we) think it's {option}
  (I|we) want {option}
  + option as Option

INTENT OptionOnly
  {option}
  + option as Option

INTENT AMAZON.StartOverIntent
INTENT AMAZON.HelpIntent
INTENT AMAZON.FallbackIntent