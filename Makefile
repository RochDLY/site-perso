# Pandoc-SSP https://github.com/infologie/pandoc-ssp/
# by Arthur Perret https://www.arthurperret.fr
# custom by Roch Delannay https://github.com/RochDLY/pandoc-site

########################VARIABLES##############################

POSTS := $(sort $(shell find src/posts -type f -iname '*.md'))
POSTS_DOCS := $(patsubst %.md, docs/posts/%.html, $(notdir $(POSTS)))

PAGES := $(sort $(shell find src/pages -type f -iname '*.md'))
PAGES_DOCS := $(patsubst %.md, docs/pages/%.html, $(notdir $(PAGES)))

# Exclusion du fichier publication.html
HTML_FILES := $(filter-out docs/pages/publications.html, $(wildcard docs/pages/*.html))

# Copy static files recursively :
# (Adapted from https://stackoverflow.com/questions/41993726/)
STATIC := $(shell find static -type f)
STATIC_DOCS := $(patsubst static/%, docs/%, $(STATIC))
$(foreach s,$(STATIC),$(foreach t,$(filter %$(notdir $s),$(STATIC_DOCS)),$(eval $t: $s)))
$(STATIC_DOCS):; $(if $(wildcard $(@D)),,mkdir -p $(@D) &&) cp $^ $@

references = src/bibliography/references.bib
csl_file = templates/csl/apa.csl
metadata_site = src/metadata.yml

PANDOCFLAGS = \
	--from markdown \
	--to html \
	--standalone \
	--wrap none \
	--metadata-file $(metadata_site) \
	--citeproc \
	--bibliography $(references) \
	--csl $(csl_file)


#############################COMMANDS###########################


.PHONY: all html clean #pdf

all: clean html serve #pdf

clean:
	@ rm -rf docs/*

serve:
	@ python3 -m http.server -d docs/

# Pandoc conversions
# HTML
html: $(STATIC_DOCS) docs/index.html $(POSTS_DOCS) $(PAGES_DOCS) docs/pages/publications.html

docs/index.html: src/index.md templates/index.html $(metadata_site)
	@ echo "Production de l'index."
	@ pandoc \
  	$< \
		$(PANDOCFLAGS) \
		--template templates/index.html \
		--output $@
	@ echo "L'index est construit."

docs/pages/%.html: src/pages/%.md $(metadata_site) templates/page.html
	@ mkdir -p "$(@D)"
	@ echo "Production de la page \"$@\"..."
	@ pandoc \
  	$< \
		$(PANDOCFLAGS) \
		--template templates/page.html \
		--output $@
	@ echo "La page \"$@\" est construite."

docs/pages/publications.html: src/pages/publications.md $(metadata_site) templates/page-publications.html
	@ mkdir -p "$(@D)"
	@ echo "Production de la page \"$@\"..."
	@ pandoc \
  	$< \
		$(PANDOCFLAGS) \
		--template templates/page-publications.html \
		--output $@
	@ echo "La page \"$@\" est construite."
	

#docs/posts/%.html: src/posts/%.md $(metadata_site) templates/post.html
#	@ mkdir -p "$(@D)"
#	@ echo "Production du billet \"$@\"..."
#	@ pandoc \
#  	$< \
#		$(PANDOCFLAGS) \
#		--template templates/post.html \
#		--table-of-content \
#		--output $@
#	@ echo "Le billet \"$@\" est construit."

# PDF
#pdf: docs/these.pdf

#docs/these.pdf: src/introduction.md $(POSTS) src/conclusion.md
#	pandoc $^ [options] -o docs/these.pdf



##########################SOUS-RECETTES############################

# Actuellement les recettes ne dépendent que des fichiers sources.
# Si on modifie un template, le site n'est pas recompilé.
# Pour ça il faut créer des sous-recettes pour indiquer les dépendances
# des pages aux templates

# sous-recette pour le template des posts
#posts-partials = \
#	templates/partials/footer.html \
#	templates/partials/head.html \
#	templates/partials/header.html \
#	templates/partials/nav.html
#

#templates/post.html: $(posts-partials)
#	@ touch $@

# sous-recette pour le template de l'index
index-partials = \
	templates/partials/footer.html \
	templates/partials/head.html \
	templates/partials/header.html \
	templates/partials/nav.html

templates/index.html: $(index-partials)
	@ touch $@

pages-partials = \
	templates/partials/footer.html \
	templates/partials/head.html \
	templates/partials/header.html \
	templates/partials/nav.html

templates/page.html: $(pages-partials)
	@ touch $@

page-publications-partials = \
	templates/partials/footer.html \
	templates/partials/head.html \
	templates/partials/header.html \
	templates/partials/nav.html

templates/page-publications.html: $(page-publications-partials)
	@ touch $@
