out := dist

mkdir = @mkdir -p $(dir $@)
bundle.name := $(out)/shopping_hours

compile: $(bundle.name).min.js

$(out)/%.min.js: $(out)/%.es5.js
	uglifyjs $< -o $@ -mc

$(out)/%.es5.js: $(out)/%.js
	babel --presets `npm -g root`/babel-preset-es2015 $< -o $@

$(bundle.name).js: index.js
	$(mkdir)
	browserify -s $(basename $(notdir $@)) $< -o $@
