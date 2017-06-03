const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', //refers to User from User.js
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

//This allows the search field to search these fields in one shot
storeSchema.index({
  name: 'text',
  description: 'text'
});

//This finds reviews where the stores _id property === reviews store property
storeSchema.virtual('reviews', {
  ref: 'Review', //What model to link?
  localField: '_id', //Which field on the store?
  foreignField: 'store' //Which field on the review?
});

storeSchema.index({ location: '2dsphere'});

storeSchema.pre('save', async function(next) {
  if(!this.isModified('name')){
    next();
    return;
  }
  this.slug = slug(this.name);
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx }) //constructor will equal to store when made
  if(storesWithSlug.length){
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
})

storeSchema.statics.getTagsList = function() {
  return this.aggregate([ //aggregate is like find except for more complicated stuff
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } }},
    { $sort:  { count: -1 }}
  ])
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    //Look up stores & populate their reviews
    { 
      $lookup: { 
        from: 'reviews', 
        localField: '_id', 
        foreignField: 'store', 
        as: 'reviews'
      } 
    },
    //Filter for only items that have two or more reviews
    {
      $match: {
        'reviews.1': { $exists: true }
      }
    },
    //Add the average reviews field
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: { $avg: '$reviews.rating'}
      }
    },
    //Sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 }},
    //Limit to at most 10
    { $limit: 10 }
  ])
}

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate)

module.exports = mongoose.model('Store', storeSchema);