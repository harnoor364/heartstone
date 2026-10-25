# Photo names the page expects

Drop photos in this folder with these names (.jpg, .jpeg or .png), then run
`bash scripts/optimize-photos.sh`. A missing photo shows as a labelled burgundy panel.
Wide photos with a grey strip along the bottom: crop the strip off first.

## In place now
| File | Section | Photo |
|---|---|---|
| town-square.jpg | Our Story | Downtown fountain and benches |
| breakfast-1.jpg | Breakfast (large tile) | Plated breakfast: eggs, sausage, grits, fruit |
| breakfast-2.jpg | Breakfast | Crop of the same plate (fruit) |
| breakfast-3.jpg | Breakfast | Crop of the same plate (juice + flowers) |
| gazebo.jpg | Weddings | Victorian gazebo in a garden |
| grounds-forest.jpg | Hero poster + stand-in walkthrough | Limestone ledge in the woods |

## Waiting for the file (re-send these)
| File | Section | Photo |
|---|---|---|
| exterior.jpg | Our Story (replaces town-square) | The house: grey Victorian with two-storey porch |
| garden-view.jpg | Rooms card | Tufted chair, French doors open to the deck and gazebo |
| edwardian-suite.jpg | Rooms card | Wide shot: blue velvet sofa, sitting room, dark carved sleigh bed |
| floral-bouquet.jpg | Rooms card | Parlour with red floral wingback chairs, green carpet |
| regal-suite.jpg | Rooms card | Striped sofa, white roses, sleigh bed and fireplace behind |
| country-cottage.jpg | Rooms card | Oak bed with white robe on the wardrobe |
| victoria-house.jpg | Rooms card | Black fireplace, plaid wingback, red sofa |
| breakfast-table.jpg | Breakfast (large tile) | Wide table set with orange juice, fruit cups, yellow flowers |
| porch.jpg | Stand-in walkthrough | Long white porch with rockers and flower boxes |
| deck-evening.jpg | Stand-in walkthrough | Deck at dusk with red umbrellas and lanterns |

To rebuild the stand-in walkthrough with the house photos once they're in:

    bash scripts/make-standin-walkthrough.sh assets/photos/exterior.jpg assets/photos/porch.jpg assets/photos/edwardian-suite.jpg assets/photos/deck-evening.jpg
